import sqlite3
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from server.tests.conftest import TEST_SECRET


# ── POST /auth/magic ──────────────────────────────────────────────────────────

def test_magic_new_email_returns_200(client, mock_resend_send):
    resp = client.post("/auth/magic", json={"email": "new@example.com"})
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}
    mock_resend_send.assert_called_once()
    call_args = mock_resend_send.call_args[0][0]
    assert "new@example.com" in call_args["to"]


def test_magic_existing_user_returns_200(client, make_user, mock_resend_send):
    user = make_user("existing@example.com")
    resp = client.post("/auth/magic", json={"email": user["email"]})
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}


def test_magic_invalidates_previous_otp(client, db_path):
    email = "user@example.com"

    client.post("/auth/magic", json={"email": email})

    conn = sqlite3.connect(db_path)
    first_code = conn.execute(
        "SELECT code FROM otp_codes WHERE email=? ORDER BY expires_at DESC",
        (email,),
    ).fetchone()[0]
    conn.close()

    client.post("/auth/magic", json={"email": email})

    resp = client.post("/auth/verify", json={"email": email, "code": first_code})
    assert resp.status_code == 401


def test_magic_missing_email_field(client):
    resp = client.post("/auth/magic", json={})
    assert resp.status_code == 422


# ── POST /auth/verify ─────────────────────────────────────────────────────────

def test_verify_valid_code_creates_user_and_returns_token(client, insert_otp, db_path):
    email = "newuser@example.com"
    insert_otp(email, "123456")

    resp = client.post("/auth/verify", json={"email": email, "code": "123456"})
    assert resp.status_code == 200
    assert "token" in resp.json()

    conn = sqlite3.connect(db_path)
    user = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    conn.close()
    assert user is not None

    payload = jwt.decode(resp.json()["token"], TEST_SECRET, algorithms=["HS256"])
    assert payload["email"] == email


def test_verify_valid_code_existing_user(client, make_user, insert_otp):
    user = make_user("existing@example.com")
    insert_otp(user["email"], "654321")

    resp = client.post("/auth/verify", json={"email": user["email"], "code": "654321"})
    assert resp.status_code == 200
    payload = jwt.decode(resp.json()["token"], TEST_SECRET, algorithms=["HS256"])
    assert payload["sub"] == user["id"]


def test_verify_wrong_code(client, insert_otp):
    insert_otp("user@example.com", "111111")
    resp = client.post("/auth/verify", json={"email": "user@example.com", "code": "999999"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid or expired code"


def test_verify_expired_code(client, insert_otp):
    insert_otp("user@example.com", "222222", minutes_from_now=-60)
    resp = client.post("/auth/verify", json={"email": "user@example.com", "code": "222222"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Code has expired"


def test_verify_already_used_code(client, insert_otp):
    insert_otp("user@example.com", "333333", used=1)
    resp = client.post("/auth/verify", json={"email": "user@example.com", "code": "333333"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid or expired code"


def test_verify_marks_code_as_used(client, make_user, insert_otp):
    user = make_user("user@example.com")
    insert_otp(user["email"], "444444")

    resp1 = client.post("/auth/verify", json={"email": user["email"], "code": "444444"})
    assert resp1.status_code == 200

    resp2 = client.post("/auth/verify", json={"email": user["email"], "code": "444444"})
    assert resp2.status_code == 401


# ── Auth enforcement ──────────────────────────────────────────────────────────

def test_protected_route_no_token(client):
    resp = client.get("/households")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Missing token"


def test_protected_route_bad_token(client):
    resp = client.get("/households", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid token"


def test_protected_route_expired_token(client, make_user):
    user = make_user()
    expired_token = jwt.encode(
        {
            "sub": user["id"],
            "email": user["email"],
            "iat": datetime.now(timezone.utc) - timedelta(days=60),
            "exp": datetime.now(timezone.utc) - timedelta(days=30),
        },
        TEST_SECRET,
        algorithm="HS256",
    )
    resp = client.get("/households", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Token expired"
