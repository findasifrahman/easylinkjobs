import os
from types import SimpleNamespace

from fastapi.testclient import TestClient

os.environ["SKIP_DB_CONNECT"] = "1"
os.environ["JWT_SECRET"] = "test_access_secret"
os.environ["JWT_REFRESH_SECRET"] = "test_refresh_secret"

from app.main import app  # noqa: E402
from app.api.v1.endpoints import admin as admin_endpoint  # noqa: E402
from app.api.v1.endpoints import content as content_endpoint  # noqa: E402
from app.api.v1.endpoints import jobs as jobs_endpoint  # noqa: E402
from app.core import authz  # noqa: E402


class _Row(SimpleNamespace):
    def model_dump(self, mode: str = "json"):
        return self.__dict__


class FakeContentStore:
    def __init__(self, rows):
        self.rows = rows

    async def count(self, where=None):
        return len(self.rows)

    async def find_many(self, where=None, order=None, skip=0, take=10):
        return self.rows[skip : skip + take]

    async def find_first(self, where=None):
        slug = where.get("slug")
        for row in self.rows:
            if row.slug == slug:
                return row
        return None


class FakePagedStore:
    def __init__(self, rows):
        self.rows = rows

    async def count(self, where=None):
        return len(self.rows)

    async def find_many(self, where=None, order=None, skip=0, take=10, include=None):
        return self.rows[skip : skip + take]


class FakeJobStore:
    def __init__(self, rows):
        self.rows = rows
        self.last_where = None

    async def find_many(self, where=None, order=None, skip=0, take=10):
        self.last_where = where
        return self.rows[skip : skip + take]


def test_content_public_endpoints(monkeypatch) -> None:
    fake_db = SimpleNamespace(
        blogpost=FakeContentStore([_Row(id="b1", slug="market-update", title="Market Update", excerpt="Hot jobs", content="## Hello", isPublished=True)]),
        tutorial=FakeContentStore([_Row(id="t1", slug="visa-guide", title="Visa Guide", summary="Steps", content="### Step 1", isPublished=True)]),
    )
    monkeypatch.setattr(content_endpoint, "db", fake_db)

    client = TestClient(app)
    blog_list = client.get("/v1/content/blog")
    assert blog_list.status_code == 200
    assert blog_list.json()["data"]["items"][0]["slug"] == "market-update"

    blog_detail = client.get("/v1/content/blog/market-update")
    assert blog_detail.status_code == 200
    assert blog_detail.json()["data"]["title"] == "Market Update"

    tutorial_list = client.get("/v1/content/tutorials")
    assert tutorial_list.status_code == 200
    assert tutorial_list.json()["data"]["items"][0]["slug"] == "visa-guide"


def test_admin_users_pagination(monkeypatch) -> None:
    rows = [_Row(id=f"u{i}", email=f"user{i}@example.com", status="ACTIVE", createdAt="2026-02-28T00:00:00Z") for i in range(5)]
    fake_db = SimpleNamespace(user=FakePagedStore(rows))
    monkeypatch.setattr(admin_endpoint, "db", fake_db)

    async def fake_permissions(user_id: str, company_id: str | None):
        return {"admin:access"}

    monkeypatch.setattr(authz, "get_effective_permissions", fake_permissions)
    app.dependency_overrides[authz.get_current_user] = lambda: {"id": "admin-1", "email": "admin@example.com"}
    try:
        client = TestClient(app)
        response = client.get("/v1/admin/users?page=2&page_size=2")
        assert response.status_code == 200
        payload = response.json()["data"]
        assert payload["total"] == 5
        assert payload["page"] == 2
        assert len(payload["items"]) == 2
        assert payload["items"][0]["id"] == "u2"
    finally:
        app.dependency_overrides.clear()


def test_jobs_public_filters(monkeypatch) -> None:
    job_rows = [_Row(id="j1", title="Visa Job", city="Shanghai", country="China", visaSponsorship=True)]
    job_store = FakeJobStore(job_rows)

    async def fake_query_raw(query: str, *args):
        if "job_allowed_nationalities" in query:
            return [{"id": "j2", "title": "BD Friendly", "city": "Shanghai", "country": "China"}]
        return []

    fake_db = SimpleNamespace(job=job_store, query_raw=fake_query_raw)
    monkeypatch.setattr(jobs_endpoint, "db", fake_db)

    client = TestClient(app)
    visa_response = client.get("/v1/jobs/public?visa_type=sponsored")
    assert visa_response.status_code == 200
    assert job_store.last_where["visaSponsorship"] is True

    nationality_response = client.get("/v1/jobs/public?nationality=BD")
    assert nationality_response.status_code == 200
    assert nationality_response.json()["data"][0]["id"] == "j2"
