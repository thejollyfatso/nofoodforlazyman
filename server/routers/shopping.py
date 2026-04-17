import json
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from server.db import get_db
from server.deps import CurrentUserDep
from server.sse_bus import publish

router = APIRouter(tags=["Shopping"])


# ── Pydantic models ──────────────────────────────────────────────────────────

class QtyEntry(BaseModel):
    qty: str = ""
    unit: str = ""


class SubEntry(BaseModel):
    qty: str = ""
    unit: str = ""
    name: str


class ShoppingItem(BaseModel):
    id: str
    name: str
    normalized_name: str
    quantities: List[QtyEntry] = []
    checked: bool = False
    checked_by: Optional[str] = None
    source_recipes: List[str] = []
    optional: bool = False
    secret: bool = False
    assigned_to: List[str] = []
    substitutions: List[SubEntry] = []
    substituted_with: Optional[str] = None
    item_order: int = 0


class ShoppingWriteBody(BaseModel):
    items: List[ShoppingItem]


class ShoppingPatchBody(BaseModel):
    checked: Optional[bool] = None
    substituted_with: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _row_to_item(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "normalized_name": row["normalized_name"],
        "quantities": json.loads(row["quantities"]),
        "checked": bool(row["checked"]),
        "checked_by": row["checked_by"],
        "source_recipes": json.loads(row["source_recipes"]),
        "optional": bool(row["optional"]),
        "secret": bool(row["secret"]),
        "assigned_to": json.loads(row["assigned_to"]),
        "substitutions": json.loads(row["substitutions"]),
        "substituted_with": row["substituted_with"],
        "item_order": row["item_order"],
    }


def _build_response(items: list) -> dict:
    added_recipe_ids = list({r for item in items for r in item["source_recipes"]})
    return {"items": items, "meta": {"addedRecipeIds": added_recipe_ids}}


def _require_hh_member(conn, household_id: str, user_id: str):
    row = conn.execute(
        "SELECT role FROM household_members WHERE household_id=? AND user_id=?",
        (household_id, user_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Household not found")


def _get_items(conn, owner_type: str, owner_id: str) -> list:
    rows = conn.execute(
        "SELECT * FROM shopping_list_items"
        " WHERE owner_type=? AND owner_id=? ORDER BY item_order ASC",
        (owner_type, owner_id),
    ).fetchall()
    return [_row_to_item(r) for r in rows]


def _write_items(conn, owner_type: str, owner_id: str, items: List[ShoppingItem]):
    conn.execute(
        "DELETE FROM shopping_list_items WHERE owner_type=? AND owner_id=?",
        (owner_type, owner_id),
    )
    for item in items:
        conn.execute(
            """INSERT INTO shopping_list_items
               (id, owner_type, owner_id, name, normalized_name, quantities,
                checked, checked_by, source_recipes, optional, secret,
                assigned_to, substitutions, substituted_with, item_order)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                item.id,
                owner_type,
                owner_id,
                item.name,
                item.normalized_name,
                json.dumps([q.model_dump() for q in item.quantities]),
                1 if item.checked else 0,
                item.checked_by,
                json.dumps(item.source_recipes),
                1 if item.optional else 0,
                1 if item.secret else 0,
                json.dumps(item.assigned_to),
                json.dumps([s.model_dump() for s in item.substitutions]),
                item.substituted_with,
                item.item_order,
            ),
        )


# ── Personal list ─────────────────────────────────────────────────────────────

@router.get("/shopping")
async def get_personal_shopping(current_user: CurrentUserDep):
    with get_db() as conn:
        items = _get_items(conn, "user", current_user.id)
    return _build_response(items)


@router.post("/shopping")
async def write_personal_shopping(
    body: ShoppingWriteBody, current_user: CurrentUserDep
):
    with get_db() as conn:
        _write_items(conn, "user", current_user.id, body.items)
        items = _get_items(conn, "user", current_user.id)
    publish(f"user:{current_user.id}", "shopping_changed")
    return _build_response(items)


@router.patch("/shopping/{item_id}")
async def patch_personal_shopping(
    item_id: str, body: ShoppingPatchBody, current_user: CurrentUserDep
):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM shopping_list_items"
            " WHERE owner_type='user' AND owner_id=? AND id=?",
            (current_user.id, item_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Item not found")

        fields_set = body.model_fields_set
        updates: list = []
        values: list = []

        if "checked" in fields_set:
            updates.append("checked=?")
            values.append(1 if body.checked else 0)
            updates.append("checked_by=?")
            values.append(current_user.id if body.checked else None)

        if "substituted_with" in fields_set:
            updates.append("substituted_with=?")
            values.append(body.substituted_with)
            if body.substituted_with is not None:
                updates.append("checked=?")
                values.append(1)
                updates.append("checked_by=?")
                values.append(current_user.id)

        if updates:
            values += [current_user.id, item_id]
            conn.execute(
                f"UPDATE shopping_list_items SET {', '.join(updates)}"
                " WHERE owner_type='user' AND owner_id=? AND id=?",
                values,
            )

        updated = conn.execute(
            "SELECT * FROM shopping_list_items"
            " WHERE owner_type='user' AND owner_id=? AND id=?",
            (current_user.id, item_id),
        ).fetchone()

    publish(f"user:{current_user.id}", "shopping_changed")
    return _row_to_item(updated)


# ── Household list ────────────────────────────────────────────────────────────

@router.get("/households/{household_id}/shopping")
async def get_household_shopping(
    household_id: str, current_user: CurrentUserDep
):
    with get_db() as conn:
        _require_hh_member(conn, household_id, current_user.id)
        items = _get_items(conn, "household", household_id)
    return _build_response(items)


@router.post("/households/{household_id}/shopping")
async def write_household_shopping(
    household_id: str, body: ShoppingWriteBody, current_user: CurrentUserDep
):
    with get_db() as conn:
        _require_hh_member(conn, household_id, current_user.id)
        _write_items(conn, "household", household_id, body.items)
        items = _get_items(conn, "household", household_id)
    publish(f"household:{household_id}", "shopping_changed")
    return _build_response(items)


@router.patch("/households/{household_id}/shopping/{item_id}")
async def patch_household_shopping(
    household_id: str,
    item_id: str,
    body: ShoppingPatchBody,
    current_user: CurrentUserDep,
):
    with get_db() as conn:
        _require_hh_member(conn, household_id, current_user.id)

        row = conn.execute(
            "SELECT * FROM shopping_list_items"
            " WHERE owner_type='household' AND owner_id=? AND id=?",
            (household_id, item_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Item not found")

        fields_set = body.model_fields_set
        updates: list = []
        values: list = []

        if "checked" in fields_set:
            updates.append("checked=?")
            values.append(1 if body.checked else 0)
            updates.append("checked_by=?")
            values.append(current_user.id if body.checked else None)

        if "substituted_with" in fields_set:
            updates.append("substituted_with=?")
            values.append(body.substituted_with)
            if body.substituted_with is not None:
                updates.append("checked=?")
                values.append(1)
                updates.append("checked_by=?")
                values.append(current_user.id)

        if updates:
            values += [household_id, item_id]
            conn.execute(
                f"UPDATE shopping_list_items SET {', '.join(updates)}"
                " WHERE owner_type='household' AND owner_id=? AND id=?",
                values,
            )

        updated = conn.execute(
            "SELECT * FROM shopping_list_items"
            " WHERE owner_type='household' AND owner_id=? AND id=?",
            (household_id, item_id),
        ).fetchone()

    publish(f"household:{household_id}", "shopping_changed")
    return _row_to_item(updated)
