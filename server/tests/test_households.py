import secrets
import sqlite3
from datetime import datetime, timedelta, timezone


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ── POST /households ──────────────────────────────────────────────────────────

def test_create_household_success(client, make_user):
    owner = make_user()
    resp = client.post("/households", json={"name": "My House"}, headers=auth(owner["token"]))
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "My House"
    assert data["my_role"] == "owner"
    assert len(data["members"]) == 1
    assert data["members"][0]["role"] == "owner"
    assert data["members"][0]["user_id"] == owner["id"]


def test_create_household_with_alias_and_avatar(client, make_user):
    owner = make_user()
    resp = client.post(
        "/households",
        json={"name": "House", "alias": "Dad", "avatar_letter": "D", "avatar_color": "#FF0000"},
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 200
    member = resp.json()["members"][0]
    assert member["alias"] == "Dad"
    assert member["avatar_letter"] == "D"
    assert member["avatar_color"] == "#FF0000"


def test_create_household_strips_name_whitespace(client, make_user):
    owner = make_user()
    resp = client.post("/households", json={"name": "  Trimmed  "}, headers=auth(owner["token"]))
    assert resp.status_code == 200
    assert resp.json()["name"] == "Trimmed"


def test_create_household_unauthenticated(client):
    resp = client.post("/households", json={"name": "House"})
    assert resp.status_code == 401


# ── GET /households ───────────────────────────────────────────────────────────

def test_list_households_empty(client, make_user):
    user = make_user()
    resp = client.get("/households", headers=auth(user["token"]))
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_households_returns_own(client, make_user, make_household):
    user_a = make_user()
    user_b = make_user()
    make_household(owner=user_a, name="A1")
    make_household(owner=user_a, name="A2")
    make_household(owner=user_b, name="B1")

    resp = client.get("/households", headers=auth(user_a["token"]))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    names = {h["name"] for h in data}
    assert names == {"A1", "A2"}


def test_list_households_unauthenticated(client):
    resp = client.get("/households")
    assert resp.status_code == 401


# ── GET /households/{id} ──────────────────────────────────────────────────────

def test_get_household_returns_members(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    resp = client.get(f"/households/{household['id']}", headers=auth(owner["token"]))
    assert resp.status_code == 200
    assert len(resp.json()["members"]) == 2


def test_get_household_non_member(client, make_user, make_household):
    household, _ = make_household()
    outsider = make_user()
    resp = client.get(f"/households/{household['id']}", headers=auth(outsider["token"]))
    assert resp.status_code == 404


def test_get_household_nonexistent(client, make_user):
    user = make_user()
    resp = client.get("/households/doesnotexist", headers=auth(user["token"]))
    assert resp.status_code == 404


def test_get_household_unauthenticated(client, make_household):
    household, _ = make_household()
    resp = client.get(f"/households/{household['id']}")
    assert resp.status_code == 401


# ── PATCH /households/{id} ────────────────────────────────────────────────────

def test_edit_name_as_owner(client, make_household):
    household, owner = make_household(name="Old Name")
    resp = client.patch(
        f"/households/{household['id']}",
        json={"name": "New Name"},
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


def test_edit_name_as_member(client, make_user, make_household, add_member):
    household, _ = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    resp = client.patch(
        f"/households/{household['id']}",
        json={"name": "Hacked"},
        headers=auth(member["token"]),
    )
    assert resp.status_code == 403


def test_edit_name_non_member(client, make_user, make_household):
    household, _ = make_household()
    outsider = make_user()
    resp = client.patch(
        f"/households/{household['id']}",
        json={"name": "Hacked"},
        headers=auth(outsider["token"]),
    )
    assert resp.status_code == 404


def test_edit_name_unauthenticated(client, make_household):
    household, _ = make_household()
    resp = client.patch(f"/households/{household['id']}", json={"name": "x"})
    assert resp.status_code == 401


# ── DELETE /households/{id} ───────────────────────────────────────────────────

def test_delete_as_owner(client, make_user, make_household):
    household, owner = make_household()
    resp = client.delete(f"/households/{household['id']}", headers=auth(owner["token"]))
    assert resp.status_code == 204

    get_resp = client.get(f"/households/{household['id']}", headers=auth(owner["token"]))
    assert get_resp.status_code == 404


def test_delete_as_member(client, make_user, make_household, add_member):
    household, _ = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    resp = client.delete(f"/households/{household['id']}", headers=auth(member["token"]))
    assert resp.status_code == 403


def test_delete_cascades(client, make_user, make_household, add_member, db_path):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    invite_resp = client.post(
        f"/households/{household['id']}/invite", headers=auth(owner["token"])
    )
    assert invite_resp.status_code == 200

    client.delete(f"/households/{household['id']}", headers=auth(owner["token"]))

    conn = sqlite3.connect(db_path)
    members = conn.execute(
        "SELECT 1 FROM household_members WHERE household_id=?", (household["id"],)
    ).fetchall()
    invites = conn.execute(
        "SELECT 1 FROM household_invites WHERE household_id=?", (household["id"],)
    ).fetchall()
    conn.close()

    assert members == []
    assert invites == []


# ── POST /households/{id}/invite ──────────────────────────────────────────────

def test_generate_invite_as_owner(client, make_household):
    household, owner = make_household()
    resp = client.post(f"/households/{household['id']}/invite", headers=auth(owner["token"]))
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data and data["token"]
    assert "expires_at" in data


def test_generate_invite_as_member(client, make_user, make_household, add_member):
    household, _ = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    resp = client.post(f"/households/{household['id']}/invite", headers=auth(member["token"]))
    assert resp.status_code == 403


# ── GET /households/invites/{token} ──────────────────────────────────────────

def test_preview_invite_valid(client, make_household):
    household, owner = make_household(name="Preview House")
    invite_resp = client.post(
        f"/households/{household['id']}/invite", headers=auth(owner["token"])
    )
    token = invite_resp.json()["token"]

    resp = client.get(f"/households/invites/{token}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["household_name"] == "Preview House"
    assert data["household_id"] == household["id"]


def test_preview_invite_nonexistent(client):
    resp = client.get("/households/invites/doesnotexist")
    assert resp.status_code == 404


def test_preview_invite_expired(client, make_user, make_household, db_path):
    household, owner = make_household()
    invite_id = secrets.token_hex(16)
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = (now - timedelta(days=1)).isoformat()

    conn = sqlite3.connect(db_path)
    conn.execute(
        """INSERT INTO household_invites
           (id, household_id, created_by, token, created_at, expires_at)
           VALUES (?,?,?,?,?,?)""",
        (invite_id, household["id"], owner["id"], token, now.isoformat(), expires_at),
    )
    conn.commit()
    conn.close()

    resp = client.get(f"/households/invites/{token}")
    assert resp.status_code == 410
    assert resp.json()["detail"] == "Invite has expired"


def test_preview_invite_already_used(client, make_user, make_household, db_path):
    household, owner = make_household()
    other = make_user()
    invite_id = secrets.token_hex(16)
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(days=7)).isoformat()

    conn = sqlite3.connect(db_path)
    conn.execute(
        """INSERT INTO household_invites
           (id, household_id, created_by, token, created_at, expires_at, used_by_user_id)
           VALUES (?,?,?,?,?,?,?)""",
        (invite_id, household["id"], owner["id"], token, now.isoformat(), expires_at, other["id"]),
    )
    conn.commit()
    conn.close()

    resp = client.get(f"/households/invites/{token}")
    assert resp.status_code == 410
    assert resp.json()["detail"] == "Invite already used"


# ── POST /households/join/{token} ─────────────────────────────────────────────

def test_join_valid_invite(client, make_user, make_household):
    household, owner = make_household()
    invite_resp = client.post(
        f"/households/{household['id']}/invite", headers=auth(owner["token"])
    )
    token = invite_resp.json()["token"]

    joiner = make_user()
    resp = client.post(f"/households/join/{token}", json={}, headers=auth(joiner["token"]))
    assert resp.status_code == 200
    members = resp.json()["members"]
    assert len(members) == 2
    joiner_entry = next(m for m in members if m["user_id"] == joiner["id"])
    assert joiner_entry["role"] == "member"


def test_join_already_member(client, make_user, make_household, add_member):
    household, owner = make_household()
    invite_resp = client.post(
        f"/households/{household['id']}/invite", headers=auth(owner["token"])
    )
    token = invite_resp.json()["token"]

    existing = make_user()
    add_member(household["id"], existing["id"])

    resp = client.post(f"/households/join/{token}", json={}, headers=auth(existing["token"]))
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Already a member of this household"


def test_join_expired_invite(client, make_user, make_household, db_path):
    household, owner = make_household()
    invite_id = secrets.token_hex(16)
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = (now - timedelta(days=1)).isoformat()

    conn = sqlite3.connect(db_path)
    conn.execute(
        """INSERT INTO household_invites
           (id, household_id, created_by, token, created_at, expires_at)
           VALUES (?,?,?,?,?,?)""",
        (invite_id, household["id"], owner["id"], token, now.isoformat(), expires_at),
    )
    conn.commit()
    conn.close()

    joiner = make_user()
    resp = client.post(f"/households/join/{token}", json={}, headers=auth(joiner["token"]))
    assert resp.status_code == 410


def test_join_unauthenticated(client, make_household):
    household, owner = make_household()
    invite_resp = client.post(
        f"/households/{household['id']}/invite", headers=auth(owner["token"])
    )
    token = invite_resp.json()["token"]

    resp = client.post(f"/households/join/{token}", json={})
    assert resp.status_code == 401


# ── PATCH /households/{id}/members/me ────────────────────────────────────────

def test_update_membership_alias(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    resp = client.patch(
        f"/households/{household['id']}/members/me",
        json={"alias": "Buddy"},
        headers=auth(member["token"]),
    )
    assert resp.status_code == 200
    member_entry = next(m for m in resp.json()["members"] if m["user_id"] == member["id"])
    assert member_entry["alias"] == "Buddy"


def test_update_membership_non_member(client, make_user, make_household):
    household, _ = make_household()
    outsider = make_user()
    resp = client.patch(
        f"/households/{household['id']}/members/me",
        json={"alias": "Ghost"},
        headers=auth(outsider["token"]),
    )
    assert resp.status_code == 404


# ── DELETE /households/{id}/members/{user_id} ────────────────────────────────

def test_remove_member_as_owner(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    resp = client.delete(
        f"/households/{household['id']}/members/{member['id']}",
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 204

    get_resp = client.get(f"/households/{household['id']}", headers=auth(owner["token"]))
    user_ids = [m["user_id"] for m in get_resp.json()["members"]]
    assert member["id"] not in user_ids


def test_remove_self(client, make_household):
    household, owner = make_household()
    resp = client.delete(
        f"/households/{household['id']}/members/{owner['id']}",
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Cannot remove yourself"


def test_remove_nonexistent_member(client, make_user, make_household):
    household, owner = make_household()
    ghost = make_user()
    resp = client.delete(
        f"/households/{household['id']}/members/{ghost['id']}",
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Member not found"


def test_remove_member_as_member(client, make_user, make_household, add_member):
    household, owner = make_household()
    member_a = make_user()
    member_b = make_user()
    add_member(household["id"], member_a["id"])
    add_member(household["id"], member_b["id"])

    resp = client.delete(
        f"/households/{household['id']}/members/{member_b['id']}",
        headers=auth(member_a["token"]),
    )
    assert resp.status_code == 403


# ── POST /households/{id}/transfer ───────────────────────────────────────────

def test_transfer_ownership_success(client, make_user, make_household, add_member):
    household, owner = make_household()
    new_owner = make_user()
    add_member(household["id"], new_owner["id"])

    resp = client.post(
        f"/households/{household['id']}/transfer",
        json={"user_id": new_owner["id"]},
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["my_role"] == "member"

    new_owner_entry = next(m for m in data["members"] if m["user_id"] == new_owner["id"])
    old_owner_entry = next(m for m in data["members"] if m["user_id"] == owner["id"])
    assert new_owner_entry["role"] == "owner"
    assert old_owner_entry["role"] == "member"


def test_transfer_to_self(client, make_household):
    household, owner = make_household()
    resp = client.post(
        f"/households/{household['id']}/transfer",
        json={"user_id": owner["id"]},
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Already the owner"


def test_transfer_to_non_member(client, make_user, make_household):
    household, owner = make_household()
    ghost = make_user()
    resp = client.post(
        f"/households/{household['id']}/transfer",
        json={"user_id": ghost["id"]},
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Target member not found"


def test_transfer_as_member(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    resp = client.post(
        f"/households/{household['id']}/transfer",
        json={"user_id": owner["id"]},
        headers=auth(member["token"]),
    )
    assert resp.status_code == 403


# ── POST /households/{id}/leave ───────────────────────────────────────────────

def test_leave_as_member(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    resp = client.post(f"/households/{household['id']}/leave", headers=auth(member["token"]))
    assert resp.status_code == 204

    get_resp = client.get(f"/households/{household['id']}", headers=auth(member["token"]))
    assert get_resp.status_code == 404


def test_leave_as_owner(client, make_household):
    household, owner = make_household()
    resp = client.post(f"/households/{household['id']}/leave", headers=auth(owner["token"]))
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Owner cannot leave; transfer ownership first"


def test_leave_non_member(client, make_user, make_household):
    household, _ = make_household()
    outsider = make_user()
    resp = client.post(f"/households/{household['id']}/leave", headers=auth(outsider["token"]))
    assert resp.status_code == 404
