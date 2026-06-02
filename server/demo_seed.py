import json
import secrets
from datetime import datetime, timezone


def seed_demo_db(conn, user_id: str) -> None:
    now = datetime.now(timezone.utc).isoformat()

    conn.execute(
        "INSERT INTO users (id, email, created_at) VALUES (?,?,?)",
        (user_id, "demo@demo.local", now),
    )

    recipes = [
        {
            "title": "Banana Pancakes",
            "notes": "Great weekend breakfast. Works with overripe bananas.",
            "ingredients": [
                {"qty": "2", "unit": "", "name": "ripe bananas"},
                {"qty": "2", "unit": "", "name": "eggs"},
                {"qty": "1", "unit": "cup", "name": "all-purpose flour"},
                {"qty": "1", "unit": "cup", "name": "milk"},
                {"qty": "1", "unit": "tbsp", "name": "sugar"},
                {"qty": "1", "unit": "tsp", "name": "baking powder"},
                {"qty": "1", "unit": "pinch", "name": "salt"},
                {"qty": "1", "unit": "tbsp", "name": "butter", "optional": True},
            ],
        },
        {
            "title": "Chicken Stir-Fry",
            "notes": "Use high heat and don't overcrowd the pan.",
            "ingredients": [
                {"qty": "500", "unit": "g", "name": "chicken breast"},
                {"qty": "2", "unit": "cups", "name": "broccoli florets"},
                {"qty": "1", "unit": "", "name": "red bell pepper"},
                {"qty": "3", "unit": "cloves", "name": "garlic"},
                {"qty": "2", "unit": "tbsp", "name": "soy sauce"},
                {"qty": "1", "unit": "tbsp", "name": "oyster sauce"},
                {"qty": "1", "unit": "tsp", "name": "sesame oil"},
                {"qty": "1", "unit": "tbsp", "name": "vegetable oil"},
                {"qty": "1", "unit": "tsp", "name": "cornstarch"},
            ],
        },
        {
            "title": "Simple Tomato Pasta",
            "notes": "Reserve a cup of pasta water before draining — it binds the sauce.",
            "ingredients": [
                {"qty": "400", "unit": "g", "name": "pasta"},
                {"qty": "2", "unit": "cans", "name": "crushed tomatoes"},
                {"qty": "4", "unit": "cloves", "name": "garlic"},
                {"qty": "1", "unit": "tsp", "name": "dried oregano"},
                {"qty": "1/2", "unit": "tsp", "name": "chili flakes", "optional": True},
                {"qty": "3", "unit": "tbsp", "name": "olive oil"},
                {"qty": "1", "unit": "handful", "name": "fresh basil", "optional": True},
                {"qty": "", "unit": "", "name": "salt and pepper"},
            ],
        },
        {
            "title": "Roasted Vegetables",
            "notes": "Cut everything to a similar size so it cooks evenly.",
            "ingredients": [
                {"qty": "2", "unit": "", "name": "zucchini"},
                {"qty": "1", "unit": "", "name": "eggplant"},
                {"qty": "1", "unit": "", "name": "red onion"},
                {"qty": "2", "unit": "", "name": "bell peppers"},
                {"qty": "3", "unit": "tbsp", "name": "olive oil"},
                {"qty": "1", "unit": "tsp", "name": "dried thyme"},
                {"qty": "", "unit": "", "name": "salt and pepper"},
            ],
        },
    ]

    for i, recipe in enumerate(recipes):
        recipe_id = secrets.token_hex(16)
        conn.execute(
            """INSERT INTO recipes (id, user_id, title, notes, ingredients, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?)""",
            (
                recipe_id,
                user_id,
                recipe["title"],
                recipe["notes"],
                json.dumps(recipe["ingredients"]),
                now,
                now,
            ),
        )

    shopping_items = [
        {"name": "bananas", "qty": "4", "checked": 0},
        {"name": "eggs", "qty": "1 dozen", "checked": 0},
        {"name": "all-purpose flour", "qty": "1 bag", "checked": 1},
        {"name": "milk", "qty": "1 L", "checked": 0},
        {"name": "chicken breast", "qty": "500 g", "checked": 0},
        {"name": "broccoli", "qty": "1 head", "checked": 1},
        {"name": "pasta", "qty": "400 g", "checked": 0},
        {"name": "crushed tomatoes", "qty": "2 cans", "checked": 0},
        {"name": "olive oil", "qty": "1 bottle", "checked": 1},
    ]

    for i, item in enumerate(shopping_items):
        item_id = secrets.token_hex(16)
        quantities = json.dumps([{"qty": item["qty"], "unit": "", "source": "manual"}])
        conn.execute(
            """INSERT INTO shopping_list_items
               (id, owner_type, owner_id, name, normalized_name, quantities,
                checked, source_recipes, item_order)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                item_id,
                "user",
                user_id,
                item["name"],
                item["name"].lower().strip(),
                quantities,
                item["checked"],
                "[]",
                i,
            ),
        )
