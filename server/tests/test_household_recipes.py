import sqlite3


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ── Fixtures / helpers ────────────────────────────────────────────────────────

def make_recipe(client, user, title="Test Recipe", ingredients=None):
    body = {"title": title, "notes": "", "ingredients": ingredients or []}
    resp = client.post("/recipes", json=body, headers=auth(user["token"]))
    assert resp.status_code == 200
    return resp.json()


def share(client, household_id, recipe_id, user):
    return client.post(
        f"/households/{household_id}/recipes/{recipe_id}",
        headers=auth(user["token"]),
    )


# ── GET /households/{id}/recipes ─────────────────────────────────────────────

def test_list_household_recipes_empty(client, make_household):
    household, owner = make_household()
    resp = client.get(f"/households/{household['id']}/recipes", headers=auth(owner["token"]))
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_household_recipes_unauthenticated(client, make_household):
    household, _ = make_household()
    resp = client.get(f"/households/{household['id']}/recipes")
    assert resp.status_code == 401


def test_list_household_recipes_non_member(client, make_user, make_household):
    household, _ = make_household()
    outsider = make_user()
    resp = client.get(f"/households/{household['id']}/recipes", headers=auth(outsider["token"]))
    assert resp.status_code == 404


def test_list_household_recipes_includes_sharer_info(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"], role="member")

    recipe = make_recipe(client, member)
    share(client, household["id"], recipe["id"], member)

    resp = client.get(f"/households/{household['id']}/recipes", headers=auth(owner["token"]))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == recipe["id"]
    assert data[0]["title"] == recipe["title"]
    assert data[0]["shared_by"]["user_id"] == member["id"]
    assert data[0]["obfuscate_secrets"] is False


# ── Secret ingredient obfuscation ─────────────────────────────────────────────

def test_secret_ingredients_visible_to_owner_when_obfuscation_on(
    client, make_user, make_household, add_member
):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    recipe = make_recipe(
        client, owner,
        ingredients=[{"qty": "1", "unit": "cup", "name": "flour", "secret": False},
                     {"qty": "1", "unit": "tsp", "name": "secret spice", "secret": True}],
    )
    share(client, household["id"], recipe["id"], owner)

    # Turn on obfuscation
    client.patch(
        f"/households/{household['id']}/recipes/{recipe['id']}",
        json={"obfuscate_secrets": True},
        headers=auth(owner["token"]),
    )

    # Owner always sees all ingredients
    resp = client.get(f"/households/{household['id']}/recipes", headers=auth(owner["token"]))
    names = [i["name"] for i in resp.json()[0]["ingredients"]]
    assert "secret spice" in names


def test_secret_ingredients_hidden_from_non_owner_when_obfuscation_on(
    client, make_user, make_household, add_member
):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    recipe = make_recipe(
        client, owner,
        ingredients=[{"qty": "1", "unit": "cup", "name": "flour", "secret": False},
                     {"qty": "1", "unit": "tsp", "name": "secret spice", "secret": True}],
    )
    share(client, household["id"], recipe["id"], owner)

    client.patch(
        f"/households/{household['id']}/recipes/{recipe['id']}",
        json={"obfuscate_secrets": True},
        headers=auth(owner["token"]),
    )

    # Non-owner sees only the non-secret ingredient
    resp = client.get(f"/households/{household['id']}/recipes", headers=auth(member["token"]))
    names = [i["name"] for i in resp.json()[0]["ingredients"]]
    assert "flour" in names
    assert "secret spice" not in names


def test_secret_ingredients_visible_to_all_when_obfuscation_off(
    client, make_user, make_household, add_member
):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    recipe = make_recipe(
        client, owner,
        ingredients=[{"qty": "1", "unit": "tsp", "name": "secret spice", "secret": True}],
    )
    share(client, household["id"], recipe["id"], owner)
    # obfuscation is off by default

    resp = client.get(f"/households/{household['id']}/recipes", headers=auth(member["token"]))
    names = [i["name"] for i in resp.json()[0]["ingredients"]]
    assert "secret spice" in names


# ── POST /households/{id}/recipes/{recipe_id} ─────────────────────────────────

def test_share_recipe_success(client, make_household):
    household, owner = make_household()
    recipe = make_recipe(client, owner)

    resp = share(client, household["id"], recipe["id"], owner)
    assert resp.status_code == 201
    data = resp.json()
    assert data["id"] == recipe["id"]
    assert data["shared_by"]["user_id"] == owner["id"]
    assert data["obfuscate_secrets"] is False


def test_share_recipe_as_member(client, make_user, make_household, add_member):
    household, _ = make_household()
    member = make_user()
    add_member(household["id"], member["id"])
    recipe = make_recipe(client, member)

    resp = share(client, household["id"], recipe["id"], member)
    assert resp.status_code == 201


def test_share_recipe_not_yours(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])
    recipe = make_recipe(client, owner)

    resp = share(client, household["id"], recipe["id"], member)
    assert resp.status_code == 403


def test_share_recipe_already_shared(client, make_household):
    household, owner = make_household()
    recipe = make_recipe(client, owner)

    share(client, household["id"], recipe["id"], owner)
    resp = share(client, household["id"], recipe["id"], owner)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Recipe already shared in this household"


def test_share_recipe_non_member(client, make_user, make_household):
    household, owner = make_household()
    outsider = make_user()
    recipe = make_recipe(client, outsider)

    resp = share(client, household["id"], recipe["id"], outsider)
    assert resp.status_code == 404


def test_share_recipe_unauthenticated(client, make_household):
    household, owner = make_household()
    recipe = make_recipe(client, owner)

    resp = client.post(f"/households/{household['id']}/recipes/{recipe['id']}")
    assert resp.status_code == 401


# ── DELETE /households/{id}/recipes/{recipe_id} ──────────────────────────────

def test_unshare_recipe_success(client, make_household):
    household, owner = make_household()
    recipe = make_recipe(client, owner)
    share(client, household["id"], recipe["id"], owner)

    resp = client.delete(
        f"/households/{household['id']}/recipes/{recipe['id']}",
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 204

    list_resp = client.get(f"/households/{household['id']}/recipes", headers=auth(owner["token"]))
    assert list_resp.json() == []


def test_unshare_recipe_not_sharer(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])
    recipe = make_recipe(client, owner)
    share(client, household["id"], recipe["id"], owner)

    resp = client.delete(
        f"/households/{household['id']}/recipes/{recipe['id']}",
        headers=auth(member["token"]),
    )
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Only the sharer can unshare"


def test_unshare_recipe_not_shared(client, make_household):
    household, owner = make_household()
    recipe = make_recipe(client, owner)

    resp = client.delete(
        f"/households/{household['id']}/recipes/{recipe['id']}",
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 404


def test_unshare_recipe_non_member(client, make_user, make_household):
    household, owner = make_household()
    outsider = make_user()
    recipe = make_recipe(client, owner)
    share(client, household["id"], recipe["id"], owner)

    resp = client.delete(
        f"/households/{household['id']}/recipes/{recipe['id']}",
        headers=auth(outsider["token"]),
    )
    assert resp.status_code == 404


# ── PATCH /households/{id}/recipes/{recipe_id} ───────────────────────────────

def test_patch_obfuscate_secrets_success(client, make_household):
    household, owner = make_household()
    recipe = make_recipe(client, owner)
    share(client, household["id"], recipe["id"], owner)

    resp = client.patch(
        f"/households/{household['id']}/recipes/{recipe['id']}",
        json={"obfuscate_secrets": True},
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 200
    assert resp.json()["obfuscate_secrets"] is True

    # Toggle back off
    resp2 = client.patch(
        f"/households/{household['id']}/recipes/{recipe['id']}",
        json={"obfuscate_secrets": False},
        headers=auth(owner["token"]),
    )
    assert resp2.status_code == 200
    assert resp2.json()["obfuscate_secrets"] is False


def test_patch_obfuscate_not_sharer(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])
    recipe = make_recipe(client, owner)
    share(client, household["id"], recipe["id"], owner)

    resp = client.patch(
        f"/households/{household['id']}/recipes/{recipe['id']}",
        json={"obfuscate_secrets": True},
        headers=auth(member["token"]),
    )
    assert resp.status_code == 403


def test_patch_obfuscate_not_shared(client, make_household):
    household, owner = make_household()
    recipe = make_recipe(client, owner)

    resp = client.patch(
        f"/households/{household['id']}/recipes/{recipe['id']}",
        json={"obfuscate_secrets": True},
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 404


# ── Save a copy ───────────────────────────────────────────────────────────────

def test_save_copy_from_household_recipe(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    recipe = make_recipe(
        client, owner,
        ingredients=[{"qty": "1", "unit": "cup", "name": "flour"}],
    )
    share(client, household["id"], recipe["id"], owner)

    # Member sees the recipe and saves a copy
    visible = client.get(
        f"/households/{household['id']}/recipes", headers=auth(member["token"])
    ).json()[0]

    copy_resp = client.post(
        "/recipes",
        json={
            "title": f"{visible['shared_by']['alias'] or 'Owner'}'s {visible['title']}",
            "notes": visible.get("notes", ""),
            "ingredients": visible["ingredients"],
            "copied_from_user_id": owner["id"],
            "copied_from_alias": visible["shared_by"]["alias"] or "",
        },
        headers=auth(member["token"]),
    )
    assert copy_resp.status_code == 200
    copy = copy_resp.json()
    assert copy["copied_from_user_id"] == owner["id"]
    assert copy["ingredients"][0]["name"] == "flour"

    member_list = client.get("/recipes", headers=auth(member["token"])).json()
    assert any(r["id"] == copy["id"] for r in member_list)


def test_save_copy_excludes_obfuscated_secret_ingredients(
    client, make_user, make_household, add_member
):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    recipe = make_recipe(
        client, owner,
        ingredients=[
            {"qty": "1", "unit": "cup", "name": "flour", "secret": False},
            {"qty": "1", "unit": "tsp", "name": "secret spice", "secret": True},
        ],
    )
    share(client, household["id"], recipe["id"], owner)
    client.patch(
        f"/households/{household['id']}/recipes/{recipe['id']}",
        json={"obfuscate_secrets": True},
        headers=auth(owner["token"]),
    )

    # Member fetches household recipes — secret spice is stripped server-side
    visible = client.get(
        f"/households/{household['id']}/recipes", headers=auth(member["token"])
    ).json()[0]
    visible_names = [i["name"] for i in visible["ingredients"]]
    assert "secret spice" not in visible_names

    # Member saves a copy using only what they could see
    copy_resp = client.post(
        "/recipes",
        json={
            "title": f"Owner's {visible['title']}",
            "ingredients": visible["ingredients"],
            "copied_from_user_id": owner["id"],
            "copied_from_alias": "Owner",
        },
        headers=auth(member["token"]),
    )
    assert copy_resp.status_code == 200
    copy_ings = [i["name"] for i in copy_resp.json()["ingredients"]]
    assert "flour" in copy_ings
    assert "secret spice" not in copy_ings


# ── Cascade behaviors ─────────────────────────────────────────────────────────

def test_delete_recipe_removes_from_household(client, make_household, db_path):
    household, owner = make_household()
    recipe = make_recipe(client, owner)
    share(client, household["id"], recipe["id"], owner)

    client.delete(f"/recipes/{recipe['id']}", headers=auth(owner["token"]))

    conn = sqlite3.connect(db_path)
    row = conn.execute(
        "SELECT 1 FROM household_recipes WHERE recipe_id=?", (recipe["id"],)
    ).fetchone()
    conn.close()
    assert row is None


def test_delete_household_removes_shared_recipes(client, make_household, db_path):
    household, owner = make_household()
    recipe = make_recipe(client, owner)
    share(client, household["id"], recipe["id"], owner)

    client.delete(f"/households/{household['id']}", headers=auth(owner["token"]))

    conn = sqlite3.connect(db_path)
    row = conn.execute(
        "SELECT 1 FROM household_recipes WHERE household_id=?", (household["id"],)
    ).fetchone()
    conn.close()
    assert row is None


def test_remove_member_unshares_their_recipes(
    client, make_user, make_household, add_member, db_path
):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    recipe = make_recipe(client, member)
    share(client, household["id"], recipe["id"], member)

    # Verify it's shared
    list_resp = client.get(
        f"/households/{household['id']}/recipes", headers=auth(owner["token"])
    )
    assert len(list_resp.json()) == 1

    # Owner removes the member
    client.delete(
        f"/households/{household['id']}/members/{member['id']}",
        headers=auth(owner["token"]),
    )

    # Recipe should be gone from household
    list_resp2 = client.get(
        f"/households/{household['id']}/recipes", headers=auth(owner["token"])
    )
    assert list_resp2.json() == []


def test_leave_household_unshares_recipes(
    client, make_user, make_household, add_member
):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    recipe = make_recipe(client, member)
    share(client, household["id"], recipe["id"], member)

    client.post(f"/households/{household['id']}/leave", headers=auth(member["token"]))

    list_resp = client.get(
        f"/households/{household['id']}/recipes", headers=auth(owner["token"])
    )
    assert list_resp.json() == []
