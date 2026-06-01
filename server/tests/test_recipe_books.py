def auth(token):
    return {"Authorization": f"Bearer {token}"}


def make_recipe(client, user, title="Test Recipe"):
    resp = client.post("/recipes", json={"title": title, "notes": "", "ingredients": []}, headers=auth(user["token"]))
    assert resp.status_code == 200
    return resp.json()


def make_book(client, user, name="My Book", description=""):
    resp = client.post("/recipe-books", json={"name": name, "description": description}, headers=auth(user["token"]))
    assert resp.status_code == 201
    return resp.json()


# ── GET /recipe-books ─────────────────────────────────────────────────────────

def test_list_books_empty(client, make_user):
    user = make_user()
    resp = client.get("/recipe-books", headers=auth(user["token"]))
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_books_unauthenticated(client):
    resp = client.get("/recipe-books")
    assert resp.status_code == 401


def test_list_books_includes_recipe_ids(client, make_user):
    user = make_user()
    recipe = make_recipe(client, user)
    book = make_book(client, user)

    client.post(f"/recipe-books/{book['id']}/recipes/{recipe['id']}", headers=auth(user["token"]))

    resp = client.get("/recipe-books", headers=auth(user["token"]))
    data = resp.json()
    assert len(data) == 1
    assert data[0]["recipe_count"] == 1
    assert recipe["id"] in data[0]["recipe_ids"]


def test_list_books_only_own(client, make_user):
    user1 = make_user()
    user2 = make_user()
    make_book(client, user1, name="User1 Book")
    make_book(client, user2, name="User2 Book")

    resp = client.get("/recipe-books", headers=auth(user1["token"]))
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "User1 Book"


# ── POST /recipe-books ────────────────────────────────────────────────────────

def test_create_book(client, make_user):
    user = make_user()
    resp = client.post(
        "/recipe-books",
        json={"name": "Favorites", "description": "My fav recipes"},
        headers=auth(user["token"]),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Favorites"
    assert data["description"] == "My fav recipes"
    assert data["recipe_count"] == 0
    assert data["recipe_ids"] == []


def test_create_book_name_required(client, make_user):
    user = make_user()
    resp = client.post("/recipe-books", json={"name": "  "}, headers=auth(user["token"]))
    assert resp.status_code == 422


def test_create_book_unauthenticated(client):
    resp = client.post("/recipe-books", json={"name": "Book"})
    assert resp.status_code == 401


# ── PATCH /recipe-books/{id} ──────────────────────────────────────────────────

def test_update_book(client, make_user):
    user = make_user()
    book = make_book(client, user)

    resp = client.patch(
        f"/recipe-books/{book['id']}",
        json={"name": "Renamed", "description": "Updated"},
        headers=auth(user["token"]),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Renamed"
    assert data["description"] == "Updated"


def test_update_book_not_found(client, make_user):
    user = make_user()
    resp = client.patch("/recipe-books/nonexistent", json={"name": "X"}, headers=auth(user["token"]))
    assert resp.status_code == 404


def test_update_book_not_owner(client, make_user):
    user1 = make_user()
    user2 = make_user()
    book = make_book(client, user1)

    resp = client.patch(
        f"/recipe-books/{book['id']}",
        json={"name": "Hacked"},
        headers=auth(user2["token"]),
    )
    assert resp.status_code == 404


# ── DELETE /recipe-books/{id} ─────────────────────────────────────────────────

def test_delete_book(client, make_user):
    user = make_user()
    book = make_book(client, user)

    resp = client.delete(f"/recipe-books/{book['id']}", headers=auth(user["token"]))
    assert resp.status_code == 204

    list_resp = client.get("/recipe-books", headers=auth(user["token"]))
    assert list_resp.json() == []


def test_delete_book_recipes_remain(client, make_user):
    user = make_user()
    recipe = make_recipe(client, user)
    book = make_book(client, user)
    client.post(f"/recipe-books/{book['id']}/recipes/{recipe['id']}", headers=auth(user["token"]))

    client.delete(f"/recipe-books/{book['id']}", headers=auth(user["token"]))

    recipes_resp = client.get("/recipes", headers=auth(user["token"]))
    ids = [r["id"] for r in recipes_resp.json()]
    assert recipe["id"] in ids


def test_delete_book_not_owner(client, make_user):
    user1 = make_user()
    user2 = make_user()
    book = make_book(client, user1)

    resp = client.delete(f"/recipe-books/{book['id']}", headers=auth(user2["token"]))
    assert resp.status_code == 404


# ── POST /recipe-books/{id}/recipes/{recipe_id} ───────────────────────────────

def test_add_recipe_to_book(client, make_user):
    user = make_user()
    recipe = make_recipe(client, user)
    book = make_book(client, user)

    resp = client.post(
        f"/recipe-books/{book['id']}/recipes/{recipe['id']}",
        headers=auth(user["token"]),
    )
    assert resp.status_code == 201

    list_resp = client.get("/recipe-books", headers=auth(user["token"]))
    data = list_resp.json()
    assert data[0]["recipe_count"] == 1
    assert recipe["id"] in data[0]["recipe_ids"]


def test_add_recipe_idempotent(client, make_user):
    user = make_user()
    recipe = make_recipe(client, user)
    book = make_book(client, user)

    client.post(f"/recipe-books/{book['id']}/recipes/{recipe['id']}", headers=auth(user["token"]))
    resp = client.post(f"/recipe-books/{book['id']}/recipes/{recipe['id']}", headers=auth(user["token"]))
    assert resp.status_code == 201

    list_resp = client.get("/recipe-books", headers=auth(user["token"]))
    assert list_resp.json()[0]["recipe_count"] == 1


def test_add_recipe_wrong_owner(client, make_user):
    user1 = make_user()
    user2 = make_user()
    recipe = make_recipe(client, user1)
    book = make_book(client, user2)

    resp = client.post(
        f"/recipe-books/{book['id']}/recipes/{recipe['id']}",
        headers=auth(user2["token"]),
    )
    assert resp.status_code == 404


def test_add_recipe_to_book_not_yours(client, make_user):
    user1 = make_user()
    user2 = make_user()
    recipe = make_recipe(client, user2)
    book = make_book(client, user1)

    resp = client.post(
        f"/recipe-books/{book['id']}/recipes/{recipe['id']}",
        headers=auth(user1["token"]),
    )
    assert resp.status_code == 404


# ── DELETE /recipe-books/{id}/recipes/{recipe_id} ─────────────────────────────

def test_remove_recipe_from_book(client, make_user):
    user = make_user()
    recipe = make_recipe(client, user)
    book = make_book(client, user)
    client.post(f"/recipe-books/{book['id']}/recipes/{recipe['id']}", headers=auth(user["token"]))

    resp = client.delete(
        f"/recipe-books/{book['id']}/recipes/{recipe['id']}",
        headers=auth(user["token"]),
    )
    assert resp.status_code == 204

    list_resp = client.get("/recipe-books", headers=auth(user["token"]))
    assert list_resp.json()[0]["recipe_count"] == 0


def test_remove_recipe_not_in_book(client, make_user):
    user = make_user()
    recipe = make_recipe(client, user)
    book = make_book(client, user)

    resp = client.delete(
        f"/recipe-books/{book['id']}/recipes/{recipe['id']}",
        headers=auth(user["token"]),
    )
    assert resp.status_code == 204


# ── Recipe in multiple books ──────────────────────────────────────────────────

def test_recipe_in_multiple_books(client, make_user):
    user = make_user()
    recipe = make_recipe(client, user)
    book1 = make_book(client, user, name="Book 1")
    book2 = make_book(client, user, name="Book 2")

    client.post(f"/recipe-books/{book1['id']}/recipes/{recipe['id']}", headers=auth(user["token"]))
    client.post(f"/recipe-books/{book2['id']}/recipes/{recipe['id']}", headers=auth(user["token"]))

    list_resp = client.get("/recipe-books", headers=auth(user["token"]))
    data = list_resp.json()
    assert all(recipe["id"] in b["recipe_ids"] for b in data)


def test_delete_recipe_removes_from_all_books(client, make_user):
    user = make_user()
    recipe = make_recipe(client, user)
    book = make_book(client, user)
    client.post(f"/recipe-books/{book['id']}/recipes/{recipe['id']}", headers=auth(user["token"]))

    client.delete(f"/recipes/{recipe['id']}", headers=auth(user["token"]))

    list_resp = client.get("/recipe-books", headers=auth(user["token"]))
    assert list_resp.json()[0]["recipe_count"] == 0


# ── GET /households/{id}/books ────────────────────────────────────────────────

def test_list_household_books_empty(client, make_household):
    household, owner = make_household()
    resp = client.get(f"/households/{household['id']}/books", headers=auth(owner["token"]))
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_household_books_unauthenticated(client, make_household):
    household, _ = make_household()
    resp = client.get(f"/households/{household['id']}/books")
    assert resp.status_code == 401


def test_list_household_books_non_member(client, make_user, make_household):
    household, _ = make_household()
    outsider = make_user()
    resp = client.get(f"/households/{household['id']}/books", headers=auth(outsider["token"]))
    assert resp.status_code == 404


# ── POST /households/{id}/books/{book_id} ─────────────────────────────────────

def test_share_book_success(client, make_household):
    household, owner = make_household()
    recipe = make_recipe(client, owner)
    book = make_book(client, owner)
    client.post(f"/recipe-books/{book['id']}/recipes/{recipe['id']}", headers=auth(owner["token"]))

    resp = client.post(
        f"/households/{household['id']}/books/{book['id']}",
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["id"] == book["id"]
    assert data["name"] == book["name"]
    assert data["shared_by"]["user_id"] == owner["id"]
    assert data["recipe_count"] == 1
    assert len(data["recipes"]) == 1


def test_share_book_as_member(client, make_user, make_household, add_member):
    household, _ = make_household()
    member = make_user()
    add_member(household["id"], member["id"])
    book = make_book(client, member)

    resp = client.post(
        f"/households/{household['id']}/books/{book['id']}",
        headers=auth(member["token"]),
    )
    assert resp.status_code == 201


def test_share_book_not_yours(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])
    book = make_book(client, owner)

    resp = client.post(
        f"/households/{household['id']}/books/{book['id']}",
        headers=auth(member["token"]),
    )
    assert resp.status_code == 403


def test_share_book_already_shared(client, make_household):
    household, owner = make_household()
    book = make_book(client, owner)
    client.post(f"/households/{household['id']}/books/{book['id']}", headers=auth(owner["token"]))

    resp = client.post(
        f"/households/{household['id']}/books/{book['id']}",
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Book already shared in this household"


def test_share_book_non_member(client, make_user, make_household):
    household, _ = make_household()
    outsider = make_user()
    book = make_book(client, outsider)

    resp = client.post(
        f"/households/{household['id']}/books/{book['id']}",
        headers=auth(outsider["token"]),
    )
    assert resp.status_code == 404


# ── DELETE /households/{id}/books/{book_id} ───────────────────────────────────

def test_unshare_book_success(client, make_household):
    household, owner = make_household()
    book = make_book(client, owner)
    client.post(f"/households/{household['id']}/books/{book['id']}", headers=auth(owner["token"]))

    resp = client.delete(
        f"/households/{household['id']}/books/{book['id']}",
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 204

    list_resp = client.get(f"/households/{household['id']}/books", headers=auth(owner["token"]))
    assert list_resp.json() == []


def test_unshare_book_not_sharer(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])
    book = make_book(client, owner)
    client.post(f"/households/{household['id']}/books/{book['id']}", headers=auth(owner["token"]))

    resp = client.delete(
        f"/households/{household['id']}/books/{book['id']}",
        headers=auth(member["token"]),
    )
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Only the sharer can unshare"


def test_unshare_book_not_shared(client, make_household):
    household, owner = make_household()
    book = make_book(client, owner)

    resp = client.delete(
        f"/households/{household['id']}/books/{book['id']}",
        headers=auth(owner["token"]),
    )
    assert resp.status_code == 404


# ── Cascade: leave/remove cleans up shared books ──────────────────────────────

def test_leave_household_unshares_books(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    book = make_book(client, member)
    client.post(f"/households/{household['id']}/books/{book['id']}", headers=auth(member["token"]))

    client.post(f"/households/{household['id']}/leave", headers=auth(member["token"]))

    list_resp = client.get(f"/households/{household['id']}/books", headers=auth(owner["token"]))
    assert list_resp.json() == []


def test_remove_member_unshares_books(client, make_user, make_household, add_member):
    household, owner = make_household()
    member = make_user()
    add_member(household["id"], member["id"])

    book = make_book(client, member)
    client.post(f"/households/{household['id']}/books/{book['id']}", headers=auth(member["token"]))

    client.delete(
        f"/households/{household['id']}/members/{member['id']}",
        headers=auth(owner["token"]),
    )

    list_resp = client.get(f"/households/{household['id']}/books", headers=auth(owner["token"]))
    assert list_resp.json() == []


def test_delete_book_removes_from_household(client, make_household):
    household, owner = make_household()
    book = make_book(client, owner)
    client.post(f"/households/{household['id']}/books/{book['id']}", headers=auth(owner["token"]))

    client.delete(f"/recipe-books/{book['id']}", headers=auth(owner["token"]))

    list_resp = client.get(f"/households/{household['id']}/books", headers=auth(owner["token"]))
    assert list_resp.json() == []


# ── Shared book is a reference ────────────────────────────────────────────────

def test_shared_book_reflects_recipe_additions(client, make_household):
    household, owner = make_household()
    book = make_book(client, owner)
    client.post(f"/households/{household['id']}/books/{book['id']}", headers=auth(owner["token"]))

    list_before = client.get(f"/households/{household['id']}/books", headers=auth(owner["token"])).json()
    assert list_before[0]["recipe_count"] == 0

    recipe = make_recipe(client, owner)
    client.post(f"/recipe-books/{book['id']}/recipes/{recipe['id']}", headers=auth(owner["token"]))

    list_after = client.get(f"/households/{household['id']}/books", headers=auth(owner["token"])).json()
    assert list_after[0]["recipe_count"] == 1
    assert list_after[0]["recipes"][0]["id"] == recipe["id"]
