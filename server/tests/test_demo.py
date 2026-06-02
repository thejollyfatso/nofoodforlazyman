import os
import time

import jwt
import pytest

from server.tests.conftest import TEST_SECRET


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ── POST /auth/demo ────────────────────────────────────────────────────────────

def test_demo_start_returns_token(client):
    resp = client.post("/auth/demo")
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert isinstance(data["token"], str)


def test_demo_token_decodes_with_demo_flag(client):
    resp = client.post("/auth/demo")
    token = resp.json()["token"]
    payload = jwt.decode(token, TEST_SECRET, algorithms=["HS256"])
    assert payload["demo"] is True
    assert "demo_db" in payload
    assert payload["demo_db"]


def test_demo_token_is_short_lived(client):
    resp = client.post("/auth/demo")
    token = resp.json()["token"]
    payload = jwt.decode(token, TEST_SECRET, algorithms=["HS256"])
    ttl_seconds = payload["exp"] - payload["iat"]
    assert ttl_seconds <= 2 * 60 * 60 + 5


def test_demo_creates_seeded_recipes(demo_session, client):
    token = demo_session["token"]
    resp = client.get("/recipes", headers=auth(token))
    assert resp.status_code == 200
    recipes = resp.json()
    assert len(recipes) > 0


def test_demo_creates_seeded_shopping(demo_session, client):
    token = demo_session["token"]
    resp = client.get("/shopping", headers=auth(token))
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) > 0


# ── Demo isolation ─────────────────────────────────────────────────────────────

def test_demo_write_does_not_affect_real_db(demo_session, client, make_user):
    demo_token = demo_session["token"]
    client.post("/recipes", json={"title": "Demo Only Recipe"}, headers=auth(demo_token))

    real_user = make_user()
    resp = client.get("/recipes", headers=auth(real_user["token"]))
    titles = [r["title"] for r in resp.json()]
    assert "Demo Only Recipe" not in titles


def test_real_write_does_not_affect_demo_db(demo_session, client, make_user):
    real_user = make_user()
    client.post("/recipes", json={"title": "Real Only Recipe"}, headers=auth(real_user["token"]))

    demo_token = demo_session["token"]
    resp = client.get("/recipes", headers=auth(demo_token))
    titles = [r["title"] for r in resp.json()]
    assert "Real Only Recipe" not in titles


def test_two_demo_sessions_are_independent(client, tmp_path, monkeypatch):
    import server.db as db_module

    monkeypatch.setattr(db_module, "DEMO_DB_DIR", str(tmp_path))

    token_a = client.post("/auth/demo").json()["token"]
    token_b = client.post("/auth/demo").json()["token"]

    payload_a = jwt.decode(token_a, TEST_SECRET, algorithms=["HS256"])
    payload_b = jwt.decode(token_b, TEST_SECRET, algorithms=["HS256"])
    assert payload_a["demo_db"] != payload_b["demo_db"]

    client.post("/recipes", json={"title": "Session A Recipe"}, headers=auth(token_a))

    resp_b = client.get("/recipes", headers=auth(token_b))
    titles_b = [r["title"] for r in resp_b.json()]
    assert "Session A Recipe" not in titles_b


# ── Cleanup ────────────────────────────────────────────────────────────────────

def test_cleanup_removes_old_files(tmp_path, monkeypatch):
    import server.db as db_module

    monkeypatch.setattr(db_module, "DEMO_DB_DIR", str(tmp_path))
    monkeypatch.setattr(db_module, "DEMO_DB_TTL_SECONDS", 3600)

    old_file = tmp_path / "nf4lm_demo_oldone.db"
    new_file = tmp_path / "nf4lm_demo_newone.db"
    old_file.write_text("")
    new_file.write_text("")

    old_mtime = time.time() - 5 * 3600
    os.utime(old_file, (old_mtime, old_mtime))

    db_module.cleanup_stale_demo_dbs()

    assert not old_file.exists()
    assert new_file.exists()
