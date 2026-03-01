import os
from types import SimpleNamespace

from fastapi.testclient import TestClient

os.environ["SKIP_DB_CONNECT"] = "1"
os.environ["JWT_SECRET"] = "test_access_secret"
os.environ["JWT_REFRESH_SECRET"] = "test_refresh_secret"

from app.main import app  # noqa: E402
from app.api.v1.endpoints import auth as auth_endpoint  # noqa: E402


class FakeUserStore:
    def __init__(self) -> None:
        self.by_email: dict[str, SimpleNamespace] = {}
        self.by_id: dict[str, SimpleNamespace] = {}
        self.counter = 0

    async def find_unique(self, where: dict):
        if "email" in where:
            return self.by_email.get(where["email"])
        return self.by_id.get(where["id"])

    async def create(self, data: dict):
        self.counter += 1
        user = SimpleNamespace(
            id=f"u{self.counter}",
            email=data["email"],
            passwordHash=data["passwordHash"],
            deletedAt=None,
            status=data.get("status", "ACTIVE"),
        )
        self.by_email[user.email] = user
        self.by_id[user.id] = user
        return user

    async def update(self, where: dict, data: dict):
        user = self.by_id[where["id"]]
        for key, value in data.items():
            setattr(user, key, value)
        return user


class FakeSessionStore:
    def __init__(self) -> None:
        self.items: dict[str, SimpleNamespace] = {}

    async def create(self, data: dict):
        item = SimpleNamespace(**data)
        self.items[item.id] = item
        return item

    async def update(self, where: dict, data: dict):
        item = self.items[where["id"]]
        for key, value in data.items():
            setattr(item, key, value)
        return item

    async def update_many(self, where: dict, data: dict):
        for item in self.items.values():
            if getattr(item, "userId", None) == where.get("userId") and getattr(item, "status", None) == where.get("status"):
                for key, value in data.items():
                    setattr(item, key, value)

    async def find_unique(self, where: dict):
        return self.items.get(where["id"])


class FakeCandidateStore:
    def __init__(self) -> None:
        self.items: list[SimpleNamespace] = []

    async def create(self, data: dict):
        item = SimpleNamespace(id=f"c{len(self.items) + 1}", **data)
        self.items.append(item)
        return item


class FakeCandidateProfileStore:
    def __init__(self) -> None:
        self.items: list[SimpleNamespace] = []

    async def create(self, data: dict):
        item = SimpleNamespace(id=f"cp{len(self.items) + 1}", **data)
        self.items.append(item)
        return item


class FakeRoleStore:
    async def find_unique(self, where: dict):
        if where.get("key") == "job_admin":
            return SimpleNamespace(id="role-job-admin", key="job_admin")
        return None


class FakeCompanyStore:
    def __init__(self) -> None:
        self.by_slug: dict[str, SimpleNamespace] = {}
        self.by_id: dict[str, SimpleNamespace] = {}
        self.counter = 0

    async def find_unique(self, where: dict):
        if "slug" in where:
            return self.by_slug.get(where["slug"])
        return self.by_id.get(where["id"])

    async def create(self, data: dict):
        self.counter += 1
        item = SimpleNamespace(id=f"co{self.counter}", **data)
        self.by_id[item.id] = item
        self.by_slug[item.slug] = item
        return item


class FakeSimpleCreateStore:
    def __init__(self) -> None:
        self.items: list[SimpleNamespace] = []

    async def create(self, data: dict):
        item = SimpleNamespace(id=f"row{len(self.items) + 1}", **data)
        self.items.append(item)
        return item


def build_fake_db() -> SimpleNamespace:
    return SimpleNamespace(
        user=FakeUserStore(),
        authsession=FakeSessionStore(),
        candidate=FakeCandidateStore(),
        candidateprofile=FakeCandidateProfileStore(),
        role=FakeRoleStore(),
        company=FakeCompanyStore(),
        companymember=FakeSimpleCreateStore(),
        userrole=FakeSimpleCreateStore(),
    )


def test_signup_login_happy_path(monkeypatch) -> None:
    fake_db = build_fake_db()
    monkeypatch.setattr(auth_endpoint, "db", fake_db)
    monkeypatch.setattr(auth_endpoint, "get_redis", lambda: None)

    async def fake_refresh(_: str) -> int:
        return 20

    monkeypatch.setattr(auth_endpoint, "refresh_profile_completion", fake_refresh)

    client = TestClient(app)
    signup_res = client.post(
        "/v1/auth/signup",
        json={
            "email": "user@example.com",
            "password": "StrongPass1",
            "full_name": "Rahim Uddin",
            "phone": "01700000000",
        },
    )
    assert signup_res.status_code == 200
    assert signup_res.json()["ok"] is True

    login_res = client.post("/v1/auth/login", json={"email": "user@example.com", "password": "StrongPass1"})
    assert login_res.status_code == 200
    payload = login_res.json()
    assert payload["ok"] is True
    assert payload["data"]["access_token"]
    assert payload["data"]["refresh_token"]


def test_signup_company_creates_job_admin_membership(monkeypatch) -> None:
    fake_db = build_fake_db()
    monkeypatch.setattr(auth_endpoint, "db", fake_db)
    monkeypatch.setattr(auth_endpoint, "get_redis", lambda: None)

    client = TestClient(app)
    response = client.post(
        "/v1/auth/signup/company",
        json={
            "company_name": "Acme China",
            "contact_name": "Nadia Rahman",
            "contact_designation": "HR Lead",
            "email": "hr@acmechina.dev",
            "phone": "01711111111",
            "password": "StrongPass1",
            "website": "https://acmechina.dev",
            "company_type": "WFOE",
            "org_size": "MEDIUM",
            "address_line_1": "Tianhe District, Guangzhou",
            "city": "Guangzhou",
            "province": "Guangdong",
            "country": "China",
            "business_license_no": "BL-12345",
            "description": "Employer account",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["data"]["company_id"] == "co1"
    assert payload["data"]["verification_status"] == "PENDING"
    assert payload["data"]["company_slug"] == "acme-china"

    assert len(fake_db.companymember.items) == 1
    membership = fake_db.companymember.items[0]
    assert membership.title == "HR Lead"
    assert membership.role["connect"]["id"] == "role-job-admin"
    assert membership.company["connect"]["id"] == "co1"

    assert len(fake_db.userrole.items) == 1
    user_role = fake_db.userrole.items[0]
    assert user_role.role["connect"]["id"] == "role-job-admin"
    assert user_role.company["connect"]["id"] == "co1"
