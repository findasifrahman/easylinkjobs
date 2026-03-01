import os
from types import SimpleNamespace

from fastapi.testclient import TestClient

os.environ["SKIP_DB_CONNECT"] = "1"
os.environ["JWT_SECRET"] = "test_access_secret"
os.environ["JWT_REFRESH_SECRET"] = "test_refresh_secret"

from app.main import app  # noqa: E402
from app.core import authz  # noqa: E402
from app.core.security import create_access_token  # noqa: E402


class FakeUserStore:
    async def find_unique(self, where: dict):
        if where.get("id") == "u_denied":
            return SimpleNamespace(id="u_denied", email="denied@example.com", deletedAt=None)
        return None


def test_permission_denied(monkeypatch) -> None:
    fake_db = SimpleNamespace(user=FakeUserStore())
    monkeypatch.setattr(authz, "db", fake_db)

    async def no_permissions(_: str, __: str | None):
        return set()

    monkeypatch.setattr(authz, "get_effective_permissions", no_permissions)
    token = create_access_token("u_denied", "denied@example.com")

    client = TestClient(app)
    response = client.post(
        "/v1/jobs/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "company_id": "00000000-0000-0000-0000-000000000001",
            "title": "x",
            "description": "y",
            "city": "Shanghai",
            "country": "China",
        },
    )
    assert response.status_code == 403
    payload = response.json()
    assert payload["ok"] is False
