import json
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from server.db import get_db
from server.deps import CurrentUserDep

router = APIRouter(tags=["Recipes"])


class IngredientSub(BaseModel):
    qty: str = ""
    unit: str = ""
    name: str


class Ingredient(BaseModel):
    qty: str = ""
    unit: str = ""
    name: str
    substitutions: Optional[List[IngredientSub]] = None
    optional: Optional[bool] = None
    secret: Optional[bool] = None


class RecipeBody(BaseModel):
    title: str
    notes: Optional[str] = None
    ingredients: List[Ingredient] = []
    created_at: Optional[str] = None
    copied_from_user_id: Optional[str] = None
    copied_from_alias: Optional[str] = None


class RecipePatch(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    ingredients: Optional[List[Ingredient]] = None


def _pack_ingredients(ingredients: List[Ingredient]) -> str:
    result = []
    for ing in ingredients:
        if not ing.name.strip():
            continue
        d: dict = {"qty": ing.qty, "unit": ing.unit, "name": ing.name}
        if ing.substitutions:
            d["substitutions"] = [
                {"qty": s.qty, "unit": s.unit, "name": s.name}
                for s in ing.substitutions
                if s.name.strip()
            ]
        if ing.optional:
            d["optional"] = True
        if ing.secret:
            d["secret"] = True
        result.append(d)
    return json.dumps(result)


def _row_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "notes": row["notes"],
        "ingredients": json.loads(row["ingredients"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "copied_from_user_id": row["copied_from_user_id"],
        "copied_from_alias": row["copied_from_alias"],
    }


@router.get("")
def list_recipes(current_user: CurrentUserDep):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM recipes WHERE user_id=? ORDER BY created_at DESC",
            (current_user.id,),
        ).fetchall()
    return [_row_to_dict(r) for r in rows]


@router.post("")
def create_recipe(body: RecipeBody, current_user: CurrentUserDep):
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title is required")

    recipe_id = secrets.token_hex(16)
    now = datetime.now(timezone.utc).isoformat()
    created_at = body.created_at or now

    with get_db() as conn:
        conn.execute(
            """INSERT INTO recipes
               (id, user_id, title, notes, ingredients, created_at, updated_at,
                copied_from_user_id, copied_from_alias)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                recipe_id,
                current_user.id,
                title,
                body.notes or "",
                _pack_ingredients(body.ingredients),
                created_at,
                now,
                body.copied_from_user_id,
                body.copied_from_alias,
            ),
        )
        row = conn.execute(
            "SELECT * FROM recipes WHERE id=?", (recipe_id,)
        ).fetchone()
    return _row_to_dict(row)


@router.patch("/{recipe_id}")
def update_recipe(recipe_id: str, body: RecipePatch, current_user: CurrentUserDep):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM recipes WHERE id=? AND user_id=?",
            (recipe_id, current_user.id),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Recipe not found")

        now = datetime.now(timezone.utc).isoformat()
        fields, values = ["updated_at=?"], [now]

        if body.title is not None:
            title = body.title.strip()
            if not title:
                raise HTTPException(status_code=422, detail="Title is required")
            fields.append("title=?")
            values.append(title)

        if body.notes is not None:
            fields.append("notes=?")
            values.append(body.notes)

        if body.ingredients is not None:
            fields.append("ingredients=?")
            values.append(_pack_ingredients(body.ingredients))

        values += [recipe_id, current_user.id]
        conn.execute(
            f"UPDATE recipes SET {', '.join(fields)} WHERE id=? AND user_id=?",
            values,
        )
        row = conn.execute(
            "SELECT * FROM recipes WHERE id=?", (recipe_id,)
        ).fetchone()
    return _row_to_dict(row)


@router.delete("/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM recipes WHERE id=? AND user_id=?",
            (recipe_id, current_user.id),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Recipe not found")
        conn.execute(
            "DELETE FROM household_recipes WHERE recipe_id=?", (recipe_id,)
        )
        conn.execute(
            "DELETE FROM recipes WHERE id=? AND user_id=?",
            (recipe_id, current_user.id),
        )
    return None
