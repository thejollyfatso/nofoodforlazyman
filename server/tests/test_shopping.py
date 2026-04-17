import secrets


def _make_item(name="flour", **kwargs):
    return {
        "id": secrets.token_hex(8),
        "name": name,
        "normalized_name": name.lower(),
        "quantities": [{"qty": "2", "unit": "cups"}],
        "checked": False,
        "checked_by": None,
        "source_recipes": [],
        "optional": False,
        "secret": False,
        "assigned_to": [],
        "substitutions": [],
        "substituted_with": None,
        "item_order": 0,
        **kwargs,
    }


# ── Auth guard ────────────────────────────────────────────────────────────────

def test_get_shopping_unauthenticated(client):
    assert client.get("/shopping").status_code == 401


def test_post_shopping_unauthenticated(client):
    assert client.post("/shopping", json={"items": []}).status_code == 401


def test_patch_shopping_unauthenticated(client):
    assert client.patch("/shopping/abc", json={}).status_code == 401


# ── GET /shopping ─────────────────────────────────────────────────────────────

def test_get_shopping_empty(client, make_user):
    user = make_user()
    resp = client.get("/shopping", headers={"Authorization": f"Bearer {user['token']}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["meta"]["addedRecipeIds"] == []


def test_get_shopping_user_isolation(client, make_user):
    user_a = make_user()
    user_b = make_user()
    item = _make_item("butter")
    client.post(
        "/shopping",
        json={"items": [item]},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    resp = client.get("/shopping", headers={"Authorization": f"Bearer {user_b['token']}"})
    assert resp.json()["items"] == []


# ── POST /shopping ────────────────────────────────────────────────────────────

def test_post_shopping_creates_items(client, make_user):
    user = make_user()
    item = _make_item("eggs", source_recipes=["recipe1"])
    resp = client.post(
        "/shopping",
        json={"items": [item]},
        headers={"Authorization": f"Bearer {user['token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["name"] == "eggs"
    assert data["meta"]["addedRecipeIds"] == ["recipe1"]


def test_post_shopping_full_rewrite(client, make_user):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}

    client.post("/shopping", json={"items": [_make_item("old item")]}, headers=auth)
    client.post("/shopping", json={"items": [_make_item("new item")]}, headers=auth)

    resp = client.get("/shopping", headers=auth)
    names = [i["name"] for i in resp.json()["items"]]
    assert names == ["new item"]


def test_post_shopping_clears_list(client, make_user):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}

    client.post("/shopping", json={"items": [_make_item("milk")]}, headers=auth)
    client.post("/shopping", json={"items": []}, headers=auth)

    resp = client.get("/shopping", headers=auth)
    assert resp.json()["items"] == []


def test_post_shopping_preserves_fields(client, make_user):
    user = make_user()
    item = _make_item(
        "salt",
        quantities=[{"qty": "1", "unit": "tsp"}, {"qty": "2", "unit": "tbsp"}],
        optional=True,
        secret=True,
        source_recipes=["recipe-abc"],
        substitutions=[{"qty": "1", "unit": "tsp", "name": "sea salt"}],
        item_order=5,
    )
    resp = client.post(
        "/shopping",
        json={"items": [item]},
        headers={"Authorization": f"Bearer {user['token']}"},
    )
    saved = resp.json()["items"][0]
    assert saved["optional"] is True
    assert saved["secret"] is True
    assert saved["source_recipes"] == ["recipe-abc"]
    assert len(saved["quantities"]) == 2
    assert len(saved["substitutions"]) == 1
    assert saved["item_order"] == 5


# ── PATCH /shopping/{id} ──────────────────────────────────────────────────────

def test_patch_check_item(client, make_user):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    item = _make_item("onion")
    client.post("/shopping", json={"items": [item]}, headers=auth)

    resp = client.patch(
        f"/shopping/{item['id']}", json={"checked": True}, headers=auth
    )
    assert resp.status_code == 200
    assert resp.json()["checked"] is True
    assert resp.json()["checked_by"] == user["id"]


def test_patch_uncheck_item(client, make_user):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    item = _make_item("garlic", checked=True)
    client.post("/shopping", json={"items": [item]}, headers=auth)

    resp = client.patch(
        f"/shopping/{item['id']}", json={"checked": False}, headers=auth
    )
    assert resp.json()["checked"] is False
    assert resp.json()["checked_by"] is None


def test_patch_set_substituted_with(client, make_user):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    item = _make_item("butter")
    client.post("/shopping", json={"items": [item]}, headers=auth)

    resp = client.patch(
        f"/shopping/{item['id']}",
        json={"substituted_with": "margarine"},
        headers=auth,
    )
    assert resp.json()["substituted_with"] == "margarine"
    assert resp.json()["checked"] is True
    assert resp.json()["checked_by"] == user["id"]


def test_patch_item_not_found(client, make_user):
    user = make_user()
    resp = client.patch(
        "/shopping/nonexistent",
        json={"checked": True},
        headers={"Authorization": f"Bearer {user['token']}"},
    )
    assert resp.status_code == 404


def test_patch_item_wrong_owner(client, make_user):
    user_a = make_user()
    user_b = make_user()
    item = _make_item("pepper")
    client.post(
        "/shopping",
        json={"items": [item]},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    resp = client.patch(
        f"/shopping/{item['id']}",
        json={"checked": True},
        headers={"Authorization": f"Bearer {user_b['token']}"},
    )
    assert resp.status_code == 404


# ── Household shopping ────────────────────────────────────────────────────────

def test_household_get_non_member(client, make_user, make_household):
    household, _ = make_household()
    outsider = make_user()
    resp = client.get(
        f"/households/{household['id']}/shopping",
        headers={"Authorization": f"Bearer {outsider['token']}"},
    )
    assert resp.status_code == 404


def test_household_post_non_member(client, make_user, make_household):
    household, _ = make_household()
    outsider = make_user()
    resp = client.post(
        f"/households/{household['id']}/shopping",
        json={"items": []},
        headers={"Authorization": f"Bearer {outsider['token']}"},
    )
    assert resp.status_code == 404


def test_household_shared_list(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    item = _make_item("cream")
    owner_auth = {"Authorization": f"Bearer {owner['token']}"}
    member_auth = {"Authorization": f"Bearer {member['token']}"}

    client.post(
        f"/households/{household['id']}/shopping",
        json={"items": [item]},
        headers=owner_auth,
    )

    resp = client.get(f"/households/{household['id']}/shopping", headers=member_auth)
    assert resp.status_code == 200
    assert len(resp.json()["items"]) == 1
    assert resp.json()["items"][0]["name"] == "cream"


def test_household_check_item_records_checker(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    item = _make_item("tomato")
    owner_auth = {"Authorization": f"Bearer {owner['token']}"}
    member_auth = {"Authorization": f"Bearer {member['token']}"}

    client.post(
        f"/households/{household['id']}/shopping",
        json={"items": [item]},
        headers=owner_auth,
    )
    resp = client.patch(
        f"/households/{household['id']}/shopping/{item['id']}",
        json={"checked": True},
        headers=member_auth,
    )
    assert resp.json()["checked"] is True
    assert resp.json()["checked_by"] == member["id"]


def test_household_full_rewrite(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])
    auth = {"Authorization": f"Bearer {owner['token']}"}
    hh_path = f"/households/{household['id']}/shopping"

    client.post(hh_path, json={"items": [_make_item("old")]}, headers=auth)
    client.post(hh_path, json={"items": [_make_item("new")]}, headers=auth)

    resp = client.get(hh_path, headers=auth)
    assert [i["name"] for i in resp.json()["items"]] == ["new"]


def test_personal_list_separate_from_household(client, make_user, make_household, add_member):
    household, owner = make_household()
    auth = {"Authorization": f"Bearer {owner['token']}"}
    hh_path = f"/households/{household['id']}/shopping"

    client.post("/shopping", json={"items": [_make_item("personal item")]}, headers=auth)
    client.post(hh_path, json={"items": [_make_item("household item")]}, headers=auth)

    personal = client.get("/shopping", headers=auth).json()["items"]
    household_items = client.get(hh_path, headers=auth).json()["items"]

    assert [i["name"] for i in personal] == ["personal item"]
    assert [i["name"] for i in household_items] == ["household item"]
