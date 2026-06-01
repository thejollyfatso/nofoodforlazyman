import json
import secrets
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from server.db import get_db
from server.deps import CurrentUserDep

router = APIRouter(tags=["RecipeBooks"])


class RecipeBookBody(BaseModel):
    name: str
    description: Optional[str] = None


class RecipeBookPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


def _recipe_row(row) -> dict:
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


def _book_with_recipe_ids(conn, book_row) -> dict:
    recipe_id_rows = conn.execute(
        "SELECT recipe_id FROM recipe_book_recipes WHERE book_id=? ORDER BY added_at ASC",
        (book_row["id"],),
    ).fetchall()
    recipe_ids = [r["recipe_id"] for r in recipe_id_rows]
    return {
        "id": book_row["id"],
        "name": book_row["name"],
        "description": book_row["description"],
        "created_at": book_row["created_at"],
        "updated_at": book_row["updated_at"],
        "recipe_count": len(recipe_ids),
        "recipe_ids": recipe_ids,
    }


@router.get("")
def list_books(current_user: CurrentUserDep):
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM recipe_books WHERE owner_user_id=? ORDER BY created_at ASC""",
            (current_user.id,),
        ).fetchall()
        return [_book_with_recipe_ids(conn, r) for r in rows]


@router.post("", status_code=201)
def create_book(body: RecipeBookBody, current_user: CurrentUserDep):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name is required")
    book_id = secrets.token_hex(16)
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO recipe_books (id, owner_user_id, name, description, created_at, updated_at)
               VALUES (?,?,?,?,?,?)""",
            (book_id, current_user.id, name, body.description or "", now, now),
        )
        row = conn.execute(
            "SELECT * FROM recipe_books WHERE id=?", (book_id,)
        ).fetchone()
        return _book_with_recipe_ids(conn, row)


@router.get("/{book_id}")
def get_book(book_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        book = conn.execute(
            "SELECT * FROM recipe_books WHERE id=? AND owner_user_id=?",
            (book_id, current_user.id),
        ).fetchone()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        recipe_rows = conn.execute(
            """SELECT r.* FROM recipes r
               JOIN recipe_book_recipes rbr ON r.id = rbr.recipe_id
               WHERE rbr.book_id = ?
               ORDER BY r.title ASC""",
            (book_id,),
        ).fetchall()
        return {
            "id": book["id"],
            "name": book["name"],
            "description": book["description"],
            "created_at": book["created_at"],
            "updated_at": book["updated_at"],
            "recipe_count": len(recipe_rows),
            "recipe_ids": [r["id"] for r in recipe_rows],
            "recipes": [_recipe_row(r) for r in recipe_rows],
        }


@router.patch("/{book_id}")
def update_book(book_id: str, body: RecipeBookPatch, current_user: CurrentUserDep):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM recipe_books WHERE id=? AND owner_user_id=?",
            (book_id, current_user.id),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Book not found")

        now = datetime.now(timezone.utc).isoformat()
        fields, values = ["updated_at=?"], [now]

        if body.name is not None:
            name = body.name.strip()
            if not name:
                raise HTTPException(status_code=422, detail="Name is required")
            fields.append("name=?")
            values.append(name)

        if body.description is not None:
            fields.append("description=?")
            values.append(body.description)

        values += [book_id, current_user.id]
        conn.execute(
            f"UPDATE recipe_books SET {', '.join(fields)} WHERE id=? AND owner_user_id=?",
            values,
        )
        row = conn.execute(
            "SELECT * FROM recipe_books WHERE id=?", (book_id,)
        ).fetchone()
        return _book_with_recipe_ids(conn, row)


@router.delete("/{book_id}", status_code=204)
def delete_book(book_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM recipe_books WHERE id=? AND owner_user_id=?",
            (book_id, current_user.id),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Book not found")
        conn.execute(
            "DELETE FROM recipe_books WHERE id=? AND owner_user_id=?",
            (book_id, current_user.id),
        )
    return None


@router.post("/{book_id}/recipes/{recipe_id}", status_code=201)
def add_recipe_to_book(book_id: str, recipe_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        book = conn.execute(
            "SELECT id FROM recipe_books WHERE id=? AND owner_user_id=?",
            (book_id, current_user.id),
        ).fetchone()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")

        recipe = conn.execute(
            "SELECT id FROM recipes WHERE id=? AND user_id=?",
            (recipe_id, current_user.id),
        ).fetchone()
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")

        existing = conn.execute(
            "SELECT 1 FROM recipe_book_recipes WHERE book_id=? AND recipe_id=?",
            (book_id, recipe_id),
        ).fetchone()
        if existing:
            return {"book_id": book_id, "recipe_id": recipe_id}

        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO recipe_book_recipes (book_id, recipe_id, added_at) VALUES (?,?,?)",
            (book_id, recipe_id, now),
        )
        conn.execute(
            "UPDATE recipe_books SET updated_at=? WHERE id=?", (now, book_id)
        )
    return {"book_id": book_id, "recipe_id": recipe_id}


@router.delete("/{book_id}/recipes/{recipe_id}", status_code=204)
def remove_recipe_from_book(book_id: str, recipe_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        book = conn.execute(
            "SELECT id FROM recipe_books WHERE id=? AND owner_user_id=?",
            (book_id, current_user.id),
        ).fetchone()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        conn.execute(
            "DELETE FROM recipe_book_recipes WHERE book_id=? AND recipe_id=?",
            (book_id, recipe_id),
        )
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "UPDATE recipe_books SET updated_at=? WHERE id=?", (now, book_id)
        )
    return None
