def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ── GET /recipes ──────────────────────────────────────────────────────────────

def test_list_recipes_empty(client, make_user):
    user = make_user()
    resp = client.get("/recipes", headers=auth(user["token"]))
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_recipes_unauthenticated(client):
    resp = client.get("/recipes")
    assert resp.status_code == 401


def test_list_recipes_returns_own_only(client, make_user):
    user_a = make_user()
    user_b = make_user()

    client.post("/recipes", json={"title": "A Recipe"}, headers=auth(user_a["token"]))
    client.post("/recipes", json={"title": "B Recipe"}, headers=auth(user_b["token"]))

    resp_a = client.get("/recipes", headers=auth(user_a["token"]))
    titles_a = [r["title"] for r in resp_a.json()]
    assert titles_a == ["A Recipe"]

    resp_b = client.get("/recipes", headers=auth(user_b["token"]))
    titles_b = [r["title"] for r in resp_b.json()]
    assert titles_b == ["B Recipe"]


def test_list_recipes_ordered_by_created_at_desc(client, make_user):
    user = make_user()
    client.post("/recipes", json={"title": "First"}, headers=auth(user["token"]))
    client.post("/recipes", json={"title": "Second"}, headers=auth(user["token"]))
    resp = client.get("/recipes", headers=auth(user["token"]))
    titles = [r["title"] for r in resp.json()]
    assert titles == ["Second", "First"]


# ── POST /recipes ─────────────────────────────────────────────────────────────

def test_create_recipe_minimal(client, make_user):
    user = make_user()
    resp = client.post("/recipes", json={"title": "Pancakes"}, headers=auth(user["token"]))
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Pancakes"
    assert data["notes"] == ""
    assert data["ingredients"] == []
    assert data["id"]
    assert data["created_at"]
    assert data["updated_at"]
    assert data["copied_from_user_id"] is None
    assert data["copied_from_alias"] is None


def test_create_recipe_full(client, make_user):
    user = make_user()
    payload = {
        "title": "Bread",
        "notes": "Simple bread recipe",
        "ingredients": [
            {"qty": "2", "unit": "cups", "name": "flour", "optional": False},
            {"qty": "1", "unit": "tsp", "name": "salt"},
            {
                "qty": "1/2",
                "unit": "cup",
                "name": "butter",
                "optional": True,
                "substitutions": [{"qty": "1/2", "unit": "cup", "name": "margarine"}],
            },
        ],
    }
    resp = client.post("/recipes", json=payload, headers=auth(user["token"]))
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Bread"
    assert data["notes"] == "Simple bread recipe"
    assert len(data["ingredients"]) == 3
    butter = next(i for i in data["ingredients"] if i["name"] == "butter")
    assert butter["optional"] is True
    assert butter["substitutions"][0]["name"] == "margarine"


def test_create_recipe_skips_empty_name_ingredients(client, make_user):
    user = make_user()
    payload = {
        "title": "Test",
        "ingredients": [
            {"qty": "1", "unit": "cup", "name": "flour"},
            {"qty": "", "unit": "", "name": ""},
            {"qty": "2", "unit": "tsp", "name": "salt"},
        ],
    }
    resp = client.post("/recipes", json=payload, headers=auth(user["token"]))
    assert resp.status_code == 200
    assert len(resp.json()["ingredients"]) == 2


def test_create_recipe_empty_title_rejected(client, make_user):
    user = make_user()
    resp = client.post("/recipes", json={"title": "  "}, headers=auth(user["token"]))
    assert resp.status_code == 422


def test_create_recipe_unauthenticated(client):
    resp = client.post("/recipes", json={"title": "Soup"})
    assert resp.status_code == 401


def test_create_recipe_preserves_created_at(client, make_user):
    user = make_user()
    ts = "2024-01-15T10:00:00+00:00"
    resp = client.post(
        "/recipes",
        json={"title": "Backup", "created_at": ts},
        headers=auth(user["token"]),
    )
    assert resp.status_code == 200
    assert resp.json()["created_at"] == ts


def test_create_recipe_strips_title_whitespace(client, make_user):
    user = make_user()
    resp = client.post("/recipes", json={"title": "  Soup  "}, headers=auth(user["token"]))
    assert resp.status_code == 200
    assert resp.json()["title"] == "Soup"


# ── Save a copy (POST /recipes with copy metadata) ───────────────────────────

def test_save_copy_stores_metadata(client, make_user):
    copier = make_user()
    original_owner = make_user()
    resp = client.post(
        "/recipes",
        json={
            "title": "Alice's Pasta",
            "notes": "great dish",
            "ingredients": [{"qty": "200", "unit": "g", "name": "pasta"}],
            "copied_from_user_id": original_owner["id"],
            "copied_from_alias": "Alice",
        },
        headers=auth(copier["token"]),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Alice's Pasta"
    assert data["copied_from_user_id"] == original_owner["id"]
    assert data["copied_from_alias"] == "Alice"


def test_save_copy_appears_in_copier_list_only(client, make_user):
    copier = make_user()
    original_owner = make_user()
    original = client.post(
        "/recipes", json={"title": "Original"}, headers=auth(original_owner["token"])
    ).json()

    client.post(
        "/recipes",
        json={
            "title": "Bob's Original",
            "copied_from_user_id": original_owner["id"],
            "copied_from_alias": "Bob",
        },
        headers=auth(copier["token"]),
    )

    copier_list = client.get("/recipes", headers=auth(copier["token"])).json()
    owner_list = client.get("/recipes", headers=auth(original_owner["token"])).json()

    assert any(r["title"] == "Bob's Original" for r in copier_list)
    assert not any(r["title"] == "Bob's Original" for r in owner_list)
    assert any(r["id"] == original["id"] for r in owner_list)


def test_save_copy_independent_of_original(client, make_user):
    copier = make_user()
    original_owner = make_user()
    original = client.post(
        "/recipes", json={"title": "Original"}, headers=auth(original_owner["token"])
    ).json()

    copy = client.post(
        "/recipes",
        json={
            "title": "Copy's Original",
            "copied_from_user_id": original_owner["id"],
            "copied_from_alias": "Copy",
        },
        headers=auth(copier["token"]),
    ).json()

    client.delete(f"/recipes/{original['id']}", headers=auth(original_owner["token"]))

    copier_list = client.get("/recipes", headers=auth(copier["token"])).json()
    assert any(r["id"] == copy["id"] for r in copier_list)


# ── PATCH /recipes/{id} ───────────────────────────────────────────────────────

def test_patch_recipe_title(client, make_user):
    user = make_user()
    r = client.post("/recipes", json={"title": "Old"}, headers=auth(user["token"])).json()
    resp = client.patch(f"/recipes/{r['id']}", json={"title": "New"}, headers=auth(user["token"]))
    assert resp.status_code == 200
    assert resp.json()["title"] == "New"


def test_patch_recipe_notes(client, make_user):
    user = make_user()
    r = client.post("/recipes", json={"title": "T"}, headers=auth(user["token"])).json()
    resp = client.patch(f"/recipes/{r['id']}", json={"notes": "Hi"}, headers=auth(user["token"]))
    assert resp.status_code == 200
    assert resp.json()["notes"] == "Hi"


def test_patch_recipe_ingredients(client, make_user):
    user = make_user()
    r = client.post("/recipes", json={"title": "T"}, headers=auth(user["token"])).json()
    new_ings = [{"qty": "1", "unit": "cup", "name": "water"}]
    resp = client.patch(
        f"/recipes/{r['id']}", json={"ingredients": new_ings}, headers=auth(user["token"])
    )
    assert resp.status_code == 200
    assert resp.json()["ingredients"][0]["name"] == "water"


def test_patch_recipe_empty_title_rejected(client, make_user):
    user = make_user()
    r = client.post("/recipes", json={"title": "T"}, headers=auth(user["token"])).json()
    resp = client.patch(f"/recipes/{r['id']}", json={"title": ""}, headers=auth(user["token"]))
    assert resp.status_code == 422


def test_patch_recipe_not_found(client, make_user):
    user = make_user()
    resp = client.patch("/recipes/nonexistent", json={"title": "X"}, headers=auth(user["token"]))
    assert resp.status_code == 404


def test_patch_recipe_other_user_not_found(client, make_user):
    owner = make_user()
    other = make_user()
    r = client.post("/recipes", json={"title": "T"}, headers=auth(owner["token"])).json()
    resp = client.patch(f"/recipes/{r['id']}", json={"title": "X"}, headers=auth(other["token"]))
    assert resp.status_code == 404


def test_patch_recipe_updates_updated_at(client, make_user):
    user = make_user()
    r = client.post("/recipes", json={"title": "T"}, headers=auth(user["token"])).json()
    original_updated = r["updated_at"]
    import time; time.sleep(0.01)
    r2 = client.patch(f"/recipes/{r['id']}", json={"notes": "x"}, headers=auth(user["token"])).json()
    assert r2["updated_at"] >= original_updated


# ── DELETE /recipes/{id} ──────────────────────────────────────────────────────

def test_delete_recipe(client, make_user):
    user = make_user()
    r = client.post("/recipes", json={"title": "T"}, headers=auth(user["token"])).json()
    resp = client.delete(f"/recipes/{r['id']}", headers=auth(user["token"]))
    assert resp.status_code == 204
    # Verify gone
    remaining = client.get("/recipes", headers=auth(user["token"])).json()
    assert all(x["id"] != r["id"] for x in remaining)


def test_delete_recipe_not_found(client, make_user):
    user = make_user()
    resp = client.delete("/recipes/nonexistent", headers=auth(user["token"]))
    assert resp.status_code == 404


def test_delete_recipe_other_user_not_found(client, make_user):
    owner = make_user()
    other = make_user()
    r = client.post("/recipes", json={"title": "T"}, headers=auth(owner["token"])).json()
    resp = client.delete(f"/recipes/{r['id']}", headers=auth(other["token"]))
    assert resp.status_code == 404
    # Original still exists
    remaining = client.get("/recipes", headers=auth(owner["token"])).json()
    assert any(x["id"] == r["id"] for x in remaining)
