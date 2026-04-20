import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from server.db import get_db
from server.deps import CurrentUserDep

router = APIRouter(tags=["MealPlan"])


# ── Pydantic models ──────────────────────────────────────────────────────────

class CreateMealBody(BaseModel):
    name: str
    planned_date: str
    recipe_ids: List[str]
    assigned_to: List[str] = []
    persistent: bool = False
    notes: Optional[str] = None
    color: Optional[str] = None


class UpdateMealBody(BaseModel):
    name: Optional[str] = None
    planned_date: Optional[str] = None
    recipe_ids: Optional[List[str]] = None
    assigned_to: Optional[List[str]] = None
    persistent: Optional[bool] = None
    notes: Optional[str] = None
    color: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _require_hh_member(conn, household_id: str, user_id: str):
    row = conn.execute(
        "SELECT role FROM household_members WHERE household_id=? AND user_id=?",
        (household_id, user_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Household not found")


def _cleanup_expired_meals(conn, context_type: str, context_id: str):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    conn.execute(
        "DELETE FROM meal_plan"
        " WHERE context_type=? AND context_id=? AND persistent=0 AND planned_date < ?",
        (context_type, context_id, cutoff),
    )


def _cleanup_expired_bin(conn, context_type: str, context_id: str):
    now = _now_iso()
    conn.execute(
        "DELETE FROM meal_plan_bin WHERE context_type=? AND context_id=? AND expires_at < ?",
        (context_type, context_id, now),
    )


def _build_meal(conn, row) -> dict:
    meal_id = row["id"]
    recipe_rows = conn.execute(
        "SELECT r.id, r.title, r.ingredients FROM recipes r"
        " JOIN meal_plan_recipes mpr ON r.id = mpr.recipe_id"
        " WHERE mpr.meal_plan_id=?",
        (meal_id,),
    ).fetchall()
    member_rows = conn.execute(
        "SELECT user_id FROM meal_plan_members WHERE meal_plan_id=?",
        (meal_id,),
    ).fetchall()
    return {
        "id": meal_id,
        "name": row["name"],
        "planned_date": row["planned_date"],
        "persistent": bool(row["persistent"]),
        "created_by": row["created_by"],
        "created_at": row["created_at"],
        "notes": row["notes"],
        "color": row["color"],
        "recipes": [
            {
                "id": r["id"],
                "title": r["title"],
                "ingredients": json.loads(r["ingredients"]),
            }
            for r in recipe_rows
        ],
        "assigned_to": [m["user_id"] for m in member_rows],
    }


def _get_bin(conn, context_type: str, context_id: str) -> list:
    _cleanup_expired_bin(conn, context_type, context_id)
    rows = conn.execute(
        "SELECT b.id, b.recipe_id, b.added_at, b.expires_at,"
        "       r.title, r.ingredients"
        " FROM meal_plan_bin b"
        " JOIN recipes r ON r.id = b.recipe_id"
        " WHERE b.context_type=? AND b.context_id=?"
        " ORDER BY b.added_at ASC",
        (context_type, context_id),
    ).fetchall()
    return [
        {
            "id": row["id"],
            "recipe_id": row["recipe_id"],
            "recipe": {
                "id": row["recipe_id"],
                "title": row["title"],
                "ingredients": json.loads(row["ingredients"]),
            },
            "added_at": row["added_at"],
            "expires_at": row["expires_at"],
        }
        for row in rows
    ]


def _get_meals(conn, context_type: str, context_id: str, start: str, end: str) -> list:
    _cleanup_expired_meals(conn, context_type, context_id)
    rows = conn.execute(
        "SELECT * FROM meal_plan"
        " WHERE context_type=? AND context_id=?"
        " AND planned_date >= ? AND planned_date <= ?"
        " ORDER BY planned_date ASC, created_at ASC",
        (context_type, context_id, start, end),
    ).fetchall()
    return [_build_meal(conn, r) for r in rows]


def _create_meal(
    conn, context_type: str, context_id: str, user_id: str, body: CreateMealBody
) -> dict:
    meal_id = str(uuid4())
    now = _now_iso()
    conn.execute(
        "INSERT INTO meal_plan"
        " (id, context_type, context_id, name, planned_date, persistent, created_by, created_at, notes, color)"
        " VALUES (?,?,?,?,?,?,?,?,?,?)",
        (
            meal_id, context_type, context_id,
            body.name, body.planned_date,
            1 if body.persistent else 0,
            user_id, now,
            body.notes, body.color,
        ),
    )
    for recipe_id in body.recipe_ids:
        conn.execute(
            "INSERT OR IGNORE INTO meal_plan_recipes (meal_plan_id, recipe_id) VALUES (?,?)",
            (meal_id, recipe_id),
        )
    for uid in body.assigned_to:
        conn.execute(
            "INSERT OR IGNORE INTO meal_plan_members (meal_plan_id, user_id) VALUES (?,?)",
            (meal_id, uid),
        )
    # Remove planned recipes from the bin
    for recipe_id in body.recipe_ids:
        conn.execute(
            "DELETE FROM meal_plan_bin"
            " WHERE context_type=? AND context_id=? AND recipe_id=?",
            (context_type, context_id, recipe_id),
        )
    row = conn.execute("SELECT * FROM meal_plan WHERE id=?", (meal_id,)).fetchone()
    return _build_meal(conn, row)


def _update_meal(conn, meal_id: str, context_type: str, context_id: str, body: UpdateMealBody) -> dict:
    updates: list = []
    values: list = []

    if body.name is not None:
        updates.append("name=?")
        values.append(body.name)
    if body.planned_date is not None:
        updates.append("planned_date=?")
        values.append(body.planned_date)
    if body.persistent is not None:
        updates.append("persistent=?")
        values.append(1 if body.persistent else 0)
    if body.notes is not None:
        updates.append("notes=?")
        values.append(body.notes)
    if body.color is not None:
        updates.append("color=?")
        values.append(body.color)

    if updates:
        values.append(meal_id)
        conn.execute(f"UPDATE meal_plan SET {', '.join(updates)} WHERE id=?", values)

    if body.recipe_ids is not None:
        conn.execute("DELETE FROM meal_plan_recipes WHERE meal_plan_id=?", (meal_id,))
        for recipe_id in body.recipe_ids:
            conn.execute(
                "INSERT OR IGNORE INTO meal_plan_recipes (meal_plan_id, recipe_id) VALUES (?,?)",
                (meal_id, recipe_id),
            )
        # Remove newly assigned recipes from bin
        for recipe_id in body.recipe_ids:
            conn.execute(
                "DELETE FROM meal_plan_bin"
                " WHERE context_type=? AND context_id=? AND recipe_id=?",
                (context_type, context_id, recipe_id),
            )

    if body.assigned_to is not None:
        conn.execute("DELETE FROM meal_plan_members WHERE meal_plan_id=?", (meal_id,))
        for uid in body.assigned_to:
            conn.execute(
                "INSERT OR IGNORE INTO meal_plan_members (meal_plan_id, user_id) VALUES (?,?)",
                (meal_id, uid),
            )

    row = conn.execute("SELECT * FROM meal_plan WHERE id=?", (meal_id,)).fetchone()
    return _build_meal(conn, row)


def _default_range() -> tuple[str, str]:
    today = _today()
    end = (datetime.now(timezone.utc) + timedelta(days=60)).strftime("%Y-%m-%d")
    return today, end


# ── Personal endpoints ────────────────────────────────────────────────────────

@router.get("/meal-plan/bin")
async def get_personal_bin(current_user: CurrentUserDep):
    with get_db() as conn:
        return _get_bin(conn, "personal", current_user.id)


@router.get("/meal-plan")
async def get_personal_meals(
    current_user: CurrentUserDep,
    start: Optional[str] = Query(default=None),
    end: Optional[str] = Query(default=None),
):
    default_start, default_end = _default_range()
    with get_db() as conn:
        return _get_meals(
            conn, "personal", current_user.id,
            start or default_start, end or default_end,
        )


@router.post("/meal-plan")
async def create_personal_meal(body: CreateMealBody, current_user: CurrentUserDep):
    with get_db() as conn:
        return _create_meal(conn, "personal", current_user.id, current_user.id, body)


@router.patch("/meal-plan/{meal_id}")
async def update_personal_meal(
    meal_id: str, body: UpdateMealBody, current_user: CurrentUserDep
):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM meal_plan WHERE id=? AND context_type='personal' AND context_id=?",
            (meal_id, current_user.id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Meal not found")
        return _update_meal(conn, meal_id, "personal", current_user.id, body)


@router.delete("/meal-plan/{meal_id}", status_code=204)
async def delete_personal_meal(meal_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM meal_plan WHERE id=? AND context_type='personal' AND context_id=?",
            (meal_id, current_user.id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Meal not found")
        conn.execute("DELETE FROM meal_plan WHERE id=?", (meal_id,))


# ── Household endpoints ───────────────────────────────────────────────────────

@router.get("/households/{household_id}/meal-plan/bin")
async def get_household_bin(household_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        _require_hh_member(conn, household_id, current_user.id)
        return _get_bin(conn, "household", household_id)


@router.get("/households/{household_id}/meal-plan")
async def get_household_meals(
    household_id: str,
    current_user: CurrentUserDep,
    start: Optional[str] = Query(default=None),
    end: Optional[str] = Query(default=None),
):
    default_start, default_end = _default_range()
    with get_db() as conn:
        _require_hh_member(conn, household_id, current_user.id)
        return _get_meals(
            conn, "household", household_id,
            start or default_start, end or default_end,
        )


@router.post("/households/{household_id}/meal-plan")
async def create_household_meal(
    household_id: str, body: CreateMealBody, current_user: CurrentUserDep
):
    with get_db() as conn:
        _require_hh_member(conn, household_id, current_user.id)
        return _create_meal(conn, "household", household_id, current_user.id, body)


@router.patch("/households/{household_id}/meal-plan/{meal_id}")
async def update_household_meal(
    household_id: str, meal_id: str, body: UpdateMealBody, current_user: CurrentUserDep
):
    with get_db() as conn:
        _require_hh_member(conn, household_id, current_user.id)
        row = conn.execute(
            "SELECT id FROM meal_plan WHERE id=? AND context_type='household' AND context_id=?",
            (meal_id, household_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Meal not found")
        return _update_meal(conn, meal_id, "household", household_id, body)


@router.delete("/households/{household_id}/meal-plan/{meal_id}", status_code=204)
async def delete_household_meal(
    household_id: str, meal_id: str, current_user: CurrentUserDep
):
    with get_db() as conn:
        _require_hh_member(conn, household_id, current_user.id)
        row = conn.execute(
            "SELECT id FROM meal_plan WHERE id=? AND context_type='household' AND context_id=?",
            (meal_id, household_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Meal not found")
        conn.execute("DELETE FROM meal_plan WHERE id=?", (meal_id,))
