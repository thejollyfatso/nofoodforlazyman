import secrets
import sqlite3
from datetime import datetime, timedelta, timezone


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_item(name="flour", recipe_id=None, **kwargs):
    return {
        "id": secrets.token_hex(8),
        "name": name,
        "normalized_name": name.lower(),
        "quantities": [{"qty": "1", "unit": "cup"}],
        "checked": False,
        "checked_by": None,
        "source_recipes": [recipe_id] if recipe_id else [],
        "optional": False,
        "secret": False,
        "assigned_to": [],
        "substitutions": [],
        "substituted_with": None,
        "item_order": 0,
        **kwargs,
    }


def _insert_recipe(db_path, user_id, title="Test Recipe"):
    recipe_id = secrets.token_hex(8)
    now = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute(
        "INSERT INTO recipes (id, user_id, title, notes, ingredients, created_at, updated_at)"
        " VALUES (?,?,?,?,?,?,?)",
        (recipe_id, user_id, title, "", "[]", now, now),
    )
    conn.commit()
    conn.close()
    return recipe_id


def _today():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _days_from_now(n):
    return (datetime.now(timezone.utc) + timedelta(days=n)).strftime("%Y-%m-%d")


# ── Auth guards ───────────────────────────────────────────────────────────────

def test_get_bin_unauthenticated(client):
    assert client.get("/meal-plan/bin").status_code == 401


def test_get_meals_unauthenticated(client):
    assert client.get("/meal-plan").status_code == 401


def test_post_meal_unauthenticated(client):
    assert client.post("/meal-plan", json={}).status_code == 401


def test_patch_meal_unauthenticated(client):
    assert client.patch("/meal-plan/abc", json={}).status_code == 401


def test_delete_meal_unauthenticated(client):
    assert client.delete("/meal-plan/abc").status_code == 401


# ── Bin: populated by shopping list writes ────────────────────────────────────

def test_bin_empty_initially(client, make_user):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    resp = client.get("/meal-plan/bin", headers=auth)
    assert resp.status_code == 200
    assert resp.json() == []


def test_bin_populated_when_recipe_added_to_shopping(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    client.post(
        "/shopping",
        json={"items": [_make_item(recipe_id=recipe_id)]},
        headers=auth,
    )

    resp = client.get("/meal-plan/bin", headers=auth)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["recipe_id"] == recipe_id
    assert data[0]["recipe"]["id"] == recipe_id


def test_bin_entry_removed_when_recipe_removed_from_shopping(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    # Add recipe to shopping list → bin entry created
    client.post(
        "/shopping",
        json={"items": [_make_item(recipe_id=recipe_id)]},
        headers=auth,
    )
    assert len(client.get("/meal-plan/bin", headers=auth).json()) == 1

    # Remove recipe from shopping list → bin entry removed
    client.post("/shopping", json={"items": []}, headers=auth)
    assert client.get("/meal-plan/bin", headers=auth).json() == []


def test_bin_not_affected_by_clear_done(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    # Add recipe to shopping, check it off
    item = _make_item(recipe_id=recipe_id, checked=True)
    client.post("/shopping", json={"items": [item]}, headers=auth)

    # Clear Done (only removes checked items — bin should be unaffected)
    client.post("/shopping", json={"items": [], "operation": "clear_done"}, headers=auth)

    # Bin entry must still exist
    resp = client.get("/meal-plan/bin", headers=auth)
    assert len(resp.json()) == 1


def test_bin_affected_by_clear_all(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    client.post(
        "/shopping",
        json={"items": [_make_item(recipe_id=recipe_id)]},
        headers=auth,
    )
    assert len(client.get("/meal-plan/bin", headers=auth).json()) == 1

    # Clear All (no operation flag) → bin entry removed
    client.post("/shopping", json={"items": []}, headers=auth)
    assert client.get("/meal-plan/bin", headers=auth).json() == []


def test_bin_no_duplicate_entries(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    # Add, remove, add again — bin should have exactly one entry
    item = _make_item(recipe_id=recipe_id)
    client.post("/shopping", json={"items": [item]}, headers=auth)
    client.post("/shopping", json={"items": []}, headers=auth)
    client.post("/shopping", json={"items": [item]}, headers=auth)

    resp = client.get("/meal-plan/bin", headers=auth)
    assert len(resp.json()) == 1


def test_bin_user_isolation(client, make_user, db_path):
    user_a = make_user()
    user_b = make_user()
    recipe_id = _insert_recipe(db_path, user_a["id"])

    client.post(
        "/shopping",
        json={"items": [_make_item(recipe_id=recipe_id)]},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )

    resp = client.get(
        "/meal-plan/bin",
        headers={"Authorization": f"Bearer {user_b['token']}"},
    )
    assert resp.json() == []


# ── Meals: CRUD ───────────────────────────────────────────────────────────────

def test_get_meals_empty(client, make_user):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    resp = client.get("/meal-plan", headers=auth)
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_meal(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"], "Pasta")

    resp = client.post(
        "/meal-plan",
        json={
            "name": "Dinner",
            "planned_date": _today(),
            "recipe_ids": [recipe_id],
            "assigned_to": [],
            "persistent": False,
        },
        headers=auth,
    )
    assert resp.status_code == 200
    meal = resp.json()
    assert meal["name"] == "Dinner"
    assert meal["planned_date"] == _today()
    assert meal["persistent"] is False
    assert meal["created_by"] == user["id"]
    assert len(meal["recipes"]) == 1
    assert meal["recipes"][0]["id"] == recipe_id
    assert meal["assigned_to"] == []


def test_create_meal_removes_recipe_from_bin(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    # Put recipe in bin via shopping list
    client.post(
        "/shopping",
        json={"items": [_make_item(recipe_id=recipe_id)]},
        headers=auth,
    )
    assert len(client.get("/meal-plan/bin", headers=auth).json()) == 1

    # Create meal using that recipe
    client.post(
        "/meal-plan",
        json={"name": "Lunch", "planned_date": _today(), "recipe_ids": [recipe_id]},
        headers=auth,
    )

    # Bin entry should be gone
    assert client.get("/meal-plan/bin", headers=auth).json() == []


def test_get_meals_returns_in_range(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    tomorrow = _days_from_now(1)
    far_future = _days_from_now(90)

    client.post(
        "/meal-plan",
        json={"name": "Near", "planned_date": tomorrow, "recipe_ids": [recipe_id]},
        headers=auth,
    )
    client.post(
        "/meal-plan",
        json={"name": "Far", "planned_date": far_future, "recipe_ids": [recipe_id]},
        headers=auth,
    )

    # Default range is today → today+60: should get Near, not Far
    resp = client.get("/meal-plan", headers=auth)
    names = [m["name"] for m in resp.json()]
    assert "Near" in names
    assert "Far" not in names


def test_get_meals_explicit_range(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    far_future = _days_from_now(90)
    client.post(
        "/meal-plan",
        json={"name": "Far Out", "planned_date": far_future, "recipe_ids": [recipe_id]},
        headers=auth,
    )

    resp = client.get(
        f"/meal-plan?start={far_future}&end={far_future}",
        headers=auth,
    )
    names = [m["name"] for m in resp.json()]
    assert "Far Out" in names


def test_patch_meal_name(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    create_resp = client.post(
        "/meal-plan",
        json={"name": "Old Name", "planned_date": _today(), "recipe_ids": [recipe_id]},
        headers=auth,
    )
    meal_id = create_resp.json()["id"]

    resp = client.patch(f"/meal-plan/{meal_id}", json={"name": "New Name"}, headers=auth)
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


def test_patch_meal_date(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    create_resp = client.post(
        "/meal-plan",
        json={"name": "Dinner", "planned_date": _today(), "recipe_ids": [recipe_id]},
        headers=auth,
    )
    meal_id = create_resp.json()["id"]
    new_date = _days_from_now(3)

    resp = client.patch(f"/meal-plan/{meal_id}", json={"planned_date": new_date}, headers=auth)
    assert resp.json()["planned_date"] == new_date


def test_patch_meal_persistent(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    create_resp = client.post(
        "/meal-plan",
        json={"name": "Dinner", "planned_date": _today(), "recipe_ids": [recipe_id]},
        headers=auth,
    )
    meal_id = create_resp.json()["id"]

    resp = client.patch(f"/meal-plan/{meal_id}", json={"persistent": True}, headers=auth)
    assert resp.json()["persistent"] is True


def test_patch_meal_assigned_to(client, make_user, db_path):
    user = make_user()
    other = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    create_resp = client.post(
        "/meal-plan",
        json={"name": "Dinner", "planned_date": _today(), "recipe_ids": [recipe_id]},
        headers=auth,
    )
    meal_id = create_resp.json()["id"]

    resp = client.patch(
        f"/meal-plan/{meal_id}", json={"assigned_to": [user["id"], other["id"]]}, headers=auth
    )
    assert set(resp.json()["assigned_to"]) == {user["id"], other["id"]}


def test_delete_meal(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    create_resp = client.post(
        "/meal-plan",
        json={"name": "Dinner", "planned_date": _today(), "recipe_ids": [recipe_id]},
        headers=auth,
    )
    meal_id = create_resp.json()["id"]

    resp = client.delete(f"/meal-plan/{meal_id}", headers=auth)
    assert resp.status_code == 204

    meals = client.get("/meal-plan", headers=auth).json()
    assert not any(m["id"] == meal_id for m in meals)


def test_meal_not_found_returns_404(client, make_user):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    assert client.patch("/meal-plan/nonexistent", json={"name": "x"}, headers=auth).status_code == 404
    assert client.delete("/meal-plan/nonexistent", headers=auth).status_code == 404


def test_meal_user_isolation(client, make_user, db_path):
    user_a = make_user()
    user_b = make_user()
    recipe_id = _insert_recipe(db_path, user_a["id"])

    create_resp = client.post(
        "/meal-plan",
        json={"name": "A's Dinner", "planned_date": _today(), "recipe_ids": [recipe_id]},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    meal_id = create_resp.json()["id"]

    # B cannot access A's meal
    assert client.patch(
        f"/meal-plan/{meal_id}", json={"name": "hijack"},
        headers={"Authorization": f"Bearer {user_b['token']}"},
    ).status_code == 404
    assert client.delete(
        f"/meal-plan/{meal_id}",
        headers={"Authorization": f"Bearer {user_b['token']}"},
    ).status_code == 404


# ── Automatic cleanup of expired meals ───────────────────────────────────────

def test_expired_non_persistent_meals_cleaned_on_get(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    # Create a meal dated 40 days ago (beyond 30-day cutoff)
    old_date = _days_from_now(-40)
    create_resp = client.post(
        "/meal-plan",
        json={"name": "Old Dinner", "planned_date": old_date, "recipe_ids": [recipe_id]},
        headers=auth,
    )
    meal_id = create_resp.json()["id"]

    # GET triggers cleanup — old meal should be gone
    resp = client.get(f"/meal-plan?start={old_date}&end={old_date}", headers=auth)
    assert not any(m["id"] == meal_id for m in resp.json())


def test_persistent_meals_not_cleaned(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_id = _insert_recipe(db_path, user["id"])

    old_date = _days_from_now(-40)
    create_resp = client.post(
        "/meal-plan",
        json={
            "name": "Old Keeper",
            "planned_date": old_date,
            "recipe_ids": [recipe_id],
            "persistent": True,
        },
        headers=auth,
    )
    meal_id = create_resp.json()["id"]

    resp = client.get(f"/meal-plan?start={old_date}&end={old_date}", headers=auth)
    assert any(m["id"] == meal_id for m in resp.json())


# ── Household meal plan ───────────────────────────────────────────────────────

def test_household_bin_empty_initially(client, make_household):
    hh, owner = make_household()
    auth = {"Authorization": f"Bearer {owner['token']}"}
    resp = client.get(f"/households/{hh['id']}/meal-plan/bin", headers=auth)
    assert resp.status_code == 200
    assert resp.json() == []


def test_household_bin_requires_membership(client, make_household, make_user):
    hh, _ = make_household()
    outsider = make_user()
    resp = client.get(
        f"/households/{hh['id']}/meal-plan/bin",
        headers={"Authorization": f"Bearer {outsider['token']}"},
    )
    assert resp.status_code == 404


def test_household_bin_populated_by_shopping(client, make_household, db_path):
    hh, owner = make_household()
    auth = {"Authorization": f"Bearer {owner['token']}"}
    recipe_id = _insert_recipe(db_path, owner["id"])

    client.post(
        f"/households/{hh['id']}/shopping",
        json={"items": [_make_item(recipe_id=recipe_id)]},
        headers=auth,
    )

    resp = client.get(f"/households/{hh['id']}/meal-plan/bin", headers=auth)
    assert len(resp.json()) == 1
    assert resp.json()[0]["recipe_id"] == recipe_id


def test_household_bin_not_affected_by_clear_done(client, make_household, db_path):
    hh, owner = make_household()
    auth = {"Authorization": f"Bearer {owner['token']}"}
    recipe_id = _insert_recipe(db_path, owner["id"])

    item = _make_item(recipe_id=recipe_id, checked=True)
    client.post(
        f"/households/{hh['id']}/shopping",
        json={"items": [item]},
        headers=auth,
    )
    client.post(
        f"/households/{hh['id']}/shopping",
        json={"items": [], "operation": "clear_done"},
        headers=auth,
    )

    resp = client.get(f"/households/{hh['id']}/meal-plan/bin", headers=auth)
    assert len(resp.json()) == 1


def test_household_create_meal(client, make_household, db_path):
    hh, owner = make_household()
    auth = {"Authorization": f"Bearer {owner['token']}"}
    recipe_id = _insert_recipe(db_path, owner["id"])

    resp = client.post(
        f"/households/{hh['id']}/meal-plan",
        json={"name": "Family Dinner", "planned_date": _today(), "recipe_ids": [recipe_id]},
        headers=auth,
    )
    assert resp.status_code == 200
    meal = resp.json()
    assert meal["name"] == "Family Dinner"
    assert meal["created_by"] == owner["id"]


def test_household_create_meal_requires_membership(client, make_household, make_user, db_path):
    hh, owner = make_household()
    outsider = make_user()
    recipe_id = _insert_recipe(db_path, owner["id"])

    resp = client.post(
        f"/households/{hh['id']}/meal-plan",
        json={"name": "Sneaky", "planned_date": _today(), "recipe_ids": [recipe_id]},
        headers={"Authorization": f"Bearer {outsider['token']}"},
    )
    assert resp.status_code == 404


def test_household_delete_meal(client, make_household, db_path):
    hh, owner = make_household()
    auth = {"Authorization": f"Bearer {owner['token']}"}
    recipe_id = _insert_recipe(db_path, owner["id"])

    create_resp = client.post(
        f"/households/{hh['id']}/meal-plan",
        json={"name": "Dinner", "planned_date": _today(), "recipe_ids": [recipe_id]},
        headers=auth,
    )
    meal_id = create_resp.json()["id"]

    resp = client.delete(f"/households/{hh['id']}/meal-plan/{meal_id}", headers=auth)
    assert resp.status_code == 204


def test_household_and_personal_bins_are_separate(client, make_household, make_user, db_path):
    hh, owner = make_household()
    recipe_id = _insert_recipe(db_path, owner["id"])
    auth = {"Authorization": f"Bearer {owner['token']}"}

    # Add to personal shopping → personal bin
    client.post(
        "/shopping",
        json={"items": [_make_item(recipe_id=recipe_id)]},
        headers=auth,
    )

    personal_bin = client.get("/meal-plan/bin", headers=auth).json()
    household_bin = client.get(f"/households/{hh['id']}/meal-plan/bin", headers=auth).json()

    assert len(personal_bin) == 1
    assert len(household_bin) == 0


def test_patch_meal_recipes_removes_from_bin(client, make_user, db_path):
    user = make_user()
    auth = {"Authorization": f"Bearer {user['token']}"}
    recipe_a = _insert_recipe(db_path, user["id"], "Recipe A")
    recipe_b = _insert_recipe(db_path, user["id"], "Recipe B")

    # Put recipe_b in bin
    client.post(
        "/shopping",
        json={"items": [_make_item(recipe_id=recipe_b)]},
        headers=auth,
    )
    assert len(client.get("/meal-plan/bin", headers=auth).json()) == 1

    # Create meal with recipe_a only
    create_resp = client.post(
        "/meal-plan",
        json={"name": "Dinner", "planned_date": _today(), "recipe_ids": [recipe_a]},
        headers=auth,
    )
    meal_id = create_resp.json()["id"]

    # Add recipe_b to meal via PATCH → should remove it from bin
    client.patch(
        f"/meal-plan/{meal_id}",
        json={"recipe_ids": [recipe_a, recipe_b]},
        headers=auth,
    )

    assert client.get("/meal-plan/bin", headers=auth).json() == []
