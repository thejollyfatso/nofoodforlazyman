import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
import pytest
from starlette.testclient import TestClient

TEST_SECRET = "test-secret-do-not-use-in-prod"


@pytest.fixture(autouse=True)
def mock_resend_send():
    with patch("server.routers.auth.resend.Emails.send") as mock_send:
        mock_send.return_value = {"id": "fake-email-id"}
        yield mock_send


@pytest.fixture()
def db_path(tmp_path, monkeypatch):
    path = str(tmp_path / "test.db")
    monkeypatch.setenv("DATABASE_URL", path)
    monkeypatch.setenv("BETTER_AUTH_SECRET", TEST_SECRET)

    import server.db as db_module
    import server.deps as deps_module
    import server.routers.auth as auth_module

    monkeypatch.setattr(db_module, "DB_PATH", path)
    monkeypatch.setattr(deps_module, "SECRET", TEST_SECRET)
    monkeypatch.setattr(auth_module, "SECRET", TEST_SECRET)

    db_module.init_db()
    yield path


@pytest.fixture()
def client(db_path):
    from server.main import app
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture()
def make_user(db_path):
    def _make(email: str | None = None):
        user_id = secrets.token_hex(16)
        email = email or f"user-{user_id[:8]}@example.com"
        now = datetime.now(timezone.utc).isoformat()
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute(
            "INSERT INTO users (id, email, created_at) VALUES (?,?,?)",
            (user_id, email, now),
        )
        conn.commit()
        conn.close()
        token = jwt.encode(
            {
                "sub": user_id,
                "email": email,
                "iat": datetime.now(timezone.utc),
                "exp": datetime.now(timezone.utc) + timedelta(days=30),
            },
            TEST_SECRET,
            algorithm="HS256",
        )
        return {"id": user_id, "email": email, "token": token}
    return _make


@pytest.fixture()
def make_household(client, make_user):
    def _make(owner=None, name: str = "Test Household"):
        if owner is None:
            owner = make_user()
        resp = client.post(
            "/households",
            json={"name": name},
            headers={"Authorization": f"Bearer {owner['token']}"},
        )
        assert resp.status_code == 200
        return resp.json(), owner
    return _make


@pytest.fixture()
def add_member(db_path):
    def _add(household_id: str, user_id: str, role: str = "member"):
        now = datetime.now(timezone.utc).isoformat()
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute(
            """INSERT INTO household_members
               (household_id, user_id, role, joined_at)
               VALUES (?,?,?,?)""",
            (household_id, user_id, role, now),
        )
        conn.commit()
        conn.close()
    return _add


@pytest.fixture()
def insert_otp(db_path):
    def _insert(email: str, code: str, used: int = 0, minutes_from_now: int = 10):
        otp_id = secrets.token_hex(16)
        expires_at = (
            datetime.now(timezone.utc) + timedelta(minutes=minutes_from_now)
        ).isoformat()
        conn = sqlite3.connect(db_path)
        conn.execute(
            "INSERT INTO otp_codes (id, email, code, expires_at, used) VALUES (?,?,?,?,?)",
            (otp_id, email, code, expires_at, used),
        )
        conn.commit()
        conn.close()
        return otp_id
    return _insert
