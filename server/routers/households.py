import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from server.db import get_db
from server.deps import CurrentUserDep

router = APIRouter(tags=["Households"])

INVITE_TTL_DAYS = 7


# ── Pydantic models ──────────────────────────────────────────────────────────

class CreateHouseholdBody(BaseModel):
    name: str
    alias: Optional[str] = None
    avatar_letter: Optional[str] = None
    avatar_color: Optional[str] = None


class EditHouseholdBody(BaseModel):
    name: str


class AcceptInviteBody(BaseModel):
    alias: Optional[str] = None
    avatar_letter: Optional[str] = None
    avatar_color: Optional[str] = None


class UpdateMemberBody(BaseModel):
    alias: Optional[str] = None
    avatar_letter: Optional[str] = None
    avatar_color: Optional[str] = None


class TransferOwnershipBody(BaseModel):
    user_id: str


class ObfuscateBody(BaseModel):
    obfuscate_secrets: bool


# ── Helpers ──────────────────────────────────────────────────────────────────

def _require_role(conn, household_id: str, user_id: str, required_role: str):
    row = conn.execute(
        "SELECT role FROM household_members WHERE household_id=? AND user_id=?",
        (household_id, user_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Household not found")
    if row["role"] != required_role:
        raise HTTPException(status_code=403, detail="Forbidden")


def _require_member(conn, household_id: str, user_id: str):
    row = conn.execute(
        "SELECT role FROM household_members WHERE household_id=? AND user_id=?",
        (household_id, user_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Household not found")
    return row["role"]


def _household_detail(household_id: str, current_user_id: str):
    """Return full household dict with members. Raises 404 if not found or user not a member."""
    with get_db() as conn:
        household = conn.execute(
            "SELECT * FROM households WHERE id=?", (household_id,)
        ).fetchone()
        if not household:
            raise HTTPException(status_code=404, detail="Household not found")

        my_row = conn.execute(
            "SELECT role FROM household_members WHERE household_id=? AND user_id=?",
            (household_id, current_user_id),
        ).fetchone()
        if not my_row:
            raise HTTPException(status_code=404, detail="Household not found")

        members = conn.execute(
            """SELECT hm.user_id, hm.role, hm.alias, hm.avatar_letter, hm.avatar_color,
                      hm.joined_at, u.email
               FROM household_members hm
               JOIN users u ON hm.user_id = u.id
               WHERE hm.household_id = ?
               ORDER BY hm.joined_at ASC""",
            (household_id,),
        ).fetchall()

    return {
        "id": household["id"],
        "name": household["name"],
        "created_by": household["created_by"],
        "created_at": household["created_at"],
        "my_role": my_row["role"],
        "members": [
            {
                "user_id": m["user_id"],
                "role": m["role"],
                "alias": m["alias"],
                "avatar_letter": m["avatar_letter"],
                "avatar_color": m["avatar_color"],
                "joined_at": m["joined_at"],
                "email": m["email"],
            }
            for m in members
        ],
    }


# ── Routes ───────────────────────────────────────────────────────────────────

# NOTE: more-specific paths must be defined before /{household_id} to avoid shadowing.

@router.get("/invites/{token}")
def preview_invite(token: str):
    """Public endpoint — returns household name so the join page can display it."""
    with get_db() as conn:
        invite = conn.execute(
            """SELECT hi.*, h.name AS household_name
               FROM household_invites hi
               JOIN households h ON hi.household_id = h.id
               WHERE hi.token = ?""",
            (token,),
        ).fetchone()

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite["used_by_user_id"]:
        raise HTTPException(status_code=410, detail="Invite already used")

    expires_at = datetime.fromisoformat(invite["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invite has expired")

    return {
        "household_id": invite["household_id"],
        "household_name": invite["household_name"],
        "expires_at": invite["expires_at"],
    }


@router.post("/join/{token}")
def accept_invite(token: str, body: AcceptInviteBody, current_user: CurrentUserDep):
    with get_db() as conn:
        invite = conn.execute(
            "SELECT * FROM household_invites WHERE token=?", (token,)
        ).fetchone()

        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found")
        if invite["used_by_user_id"]:
            raise HTTPException(status_code=410, detail="Invite already used")

        expires_at = datetime.fromisoformat(invite["expires_at"])
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="Invite has expired")

        household_id = invite["household_id"]

        existing = conn.execute(
            "SELECT 1 FROM household_members WHERE household_id=? AND user_id=?",
            (household_id, current_user.id),
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Already a member of this household")

        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """INSERT INTO household_members
               (household_id, user_id, role, alias, avatar_letter, avatar_color, joined_at)
               VALUES (?,?,?,?,?,?,?)""",
            (household_id, current_user.id, "member",
             body.alias, body.avatar_letter, body.avatar_color, now),
        )
        conn.execute(
            "UPDATE household_invites SET used_by_user_id=? WHERE id=?",
            (current_user.id, invite["id"]),
        )

    return _household_detail(household_id, current_user.id)


@router.post("")
def create_household(body: CreateHouseholdBody, current_user: CurrentUserDep):
    household_id = secrets.token_hex(16)
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO households (id, name, created_by, created_at) VALUES (?,?,?,?)",
            (household_id, body.name.strip(), current_user.id, now),
        )
        conn.execute(
            """INSERT INTO household_members
               (household_id, user_id, role, alias, avatar_letter, avatar_color, joined_at)
               VALUES (?,?,?,?,?,?,?)""",
            (household_id, current_user.id, "owner",
             body.alias, body.avatar_letter, body.avatar_color, now),
        )
    return _household_detail(household_id, current_user.id)


@router.get("")
def list_households(current_user: CurrentUserDep):
    with get_db() as conn:
        rows = conn.execute(
            """SELECT h.id, h.name, h.created_by, h.created_at,
                      hm.role, hm.alias, hm.avatar_letter, hm.avatar_color
               FROM households h
               JOIN household_members hm ON h.id = hm.household_id
               WHERE hm.user_id = ?
               ORDER BY h.created_at DESC""",
            (current_user.id,),
        ).fetchall()

        result = []
        for row in rows:
            count = conn.execute(
                "SELECT COUNT(*) FROM household_members WHERE household_id=?",
                (row["id"],),
            ).fetchone()[0]
            result.append({
                "id": row["id"],
                "name": row["name"],
                "created_by": row["created_by"],
                "created_at": row["created_at"],
                "role": row["role"],
                "alias": row["alias"],
                "avatar_letter": row["avatar_letter"],
                "avatar_color": row["avatar_color"],
                "member_count": count,
            })
    return result


@router.get("/{household_id}")
def get_household(household_id: str, current_user: CurrentUserDep):
    return _household_detail(household_id, current_user.id)


@router.patch("/{household_id}")
def edit_household(household_id: str, body: EditHouseholdBody, current_user: CurrentUserDep):
    with get_db() as conn:
        _require_role(conn, household_id, current_user.id, "owner")
        conn.execute(
            "UPDATE households SET name=? WHERE id=?",
            (body.name.strip(), household_id),
        )
    return _household_detail(household_id, current_user.id)


@router.delete("/{household_id}", status_code=204)
def delete_household(household_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        _require_role(conn, household_id, current_user.id, "owner")
        conn.execute("DELETE FROM household_recipes WHERE household_id=?", (household_id,))
        conn.execute("DELETE FROM household_invites WHERE household_id=?", (household_id,))
        conn.execute("DELETE FROM household_members WHERE household_id=?", (household_id,))
        conn.execute("DELETE FROM households WHERE id=?", (household_id,))
    return None


@router.post("/{household_id}/invite")
def generate_invite(household_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        _require_role(conn, household_id, current_user.id, "owner")
        invite_id = secrets.token_hex(16)
        token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(days=INVITE_TTL_DAYS)).isoformat()
        conn.execute(
            """INSERT INTO household_invites
               (id, household_id, created_by, token, created_at, expires_at)
               VALUES (?,?,?,?,?,?)""",
            (invite_id, household_id, current_user.id, token, now.isoformat(), expires_at),
        )
    return {"token": token, "expires_at": expires_at}


@router.post("/{household_id}/leave", status_code=204)
def leave_household(household_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        role = _require_member(conn, household_id, current_user.id)
        if role == "owner":
            raise HTTPException(
                status_code=400, detail="Owner cannot leave; transfer ownership first"
            )
        conn.execute(
            "DELETE FROM household_recipes WHERE household_id=? AND shared_by_user_id=?",
            (household_id, current_user.id),
        )
        conn.execute(
            "DELETE FROM household_members WHERE household_id=? AND user_id=?",
            (household_id, current_user.id),
        )
    return None


@router.patch("/{household_id}/members/me")
def update_my_membership(household_id: str, body: UpdateMemberBody, current_user: CurrentUserDep):
    with get_db() as conn:
        _require_member(conn, household_id, current_user.id)

        fields, values = [], []
        if body.alias is not None:
            fields.append("alias=?"); values.append(body.alias)
        if body.avatar_letter is not None:
            fields.append("avatar_letter=?"); values.append(body.avatar_letter)
        if body.avatar_color is not None:
            fields.append("avatar_color=?"); values.append(body.avatar_color)

        if fields:
            values += [household_id, current_user.id]
            conn.execute(
                f"UPDATE household_members SET {', '.join(fields)} WHERE household_id=? AND user_id=?",
                values,
            )

    return _household_detail(household_id, current_user.id)


@router.delete("/{household_id}/members/{user_id}", status_code=204)
def remove_member(household_id: str, user_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        _require_role(conn, household_id, current_user.id, "owner")
        if user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot remove yourself")
        target = conn.execute(
            "SELECT 1 FROM household_members WHERE household_id=? AND user_id=?",
            (household_id, user_id),
        ).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Member not found")
        conn.execute(
            "DELETE FROM household_recipes WHERE household_id=? AND shared_by_user_id=?",
            (household_id, user_id),
        )
        conn.execute(
            "DELETE FROM household_members WHERE household_id=? AND user_id=?",
            (household_id, user_id),
        )
    return None


def _household_recipe_row(row, sharer_row) -> dict:
    ingredients = json.loads(row["ingredients"])
    return {
        "id": row["id"],
        "title": row["title"],
        "notes": row["notes"],
        "ingredients": ingredients,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "copied_from_user_id": row["copied_from_user_id"],
        "copied_from_alias": row["copied_from_alias"],
        "shared_by": {
            "user_id": sharer_row["user_id"],
            "alias": sharer_row["alias"],
            "avatar_letter": sharer_row["avatar_letter"],
            "avatar_color": sharer_row["avatar_color"],
        },
        "obfuscate_secrets": bool(row["obfuscate_secrets"]),
    }


def _apply_obfuscation(recipe_dict: dict, current_user_id: str) -> dict:
    if not recipe_dict["obfuscate_secrets"]:
        return recipe_dict
    if recipe_dict["shared_by"]["user_id"] == current_user_id:
        return recipe_dict
    recipe_dict["ingredients"] = [
        ing for ing in recipe_dict["ingredients"] if not ing.get("secret")
    ]
    return recipe_dict


@router.post("/{household_id}/transfer")
def transfer_ownership(
    household_id: str, body: TransferOwnershipBody, current_user: CurrentUserDep
):
    with get_db() as conn:
        _require_role(conn, household_id, current_user.id, "owner")
        if body.user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Already the owner")
        target = conn.execute(
            "SELECT 1 FROM household_members WHERE household_id=? AND user_id=?",
            (household_id, body.user_id),
        ).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Target member not found")
        conn.execute(
            "UPDATE household_members SET role='member' WHERE household_id=? AND user_id=?",
            (household_id, current_user.id),
        )
        conn.execute(
            "UPDATE household_members SET role='owner' WHERE household_id=? AND user_id=?",
            (household_id, body.user_id),
        )
    return _household_detail(household_id, current_user.id)


# ── Household recipe sharing ──────────────────────────────────────────────────

@router.get("/{household_id}/recipes")
def list_household_recipes(household_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        _require_member(conn, household_id, current_user.id)
        rows = conn.execute(
            """SELECT r.*, hr.shared_by_user_id, hr.obfuscate_secrets,
                      hm.alias, hm.avatar_letter, hm.avatar_color
               FROM household_recipes hr
               JOIN recipes r ON hr.recipe_id = r.id
               JOIN household_members hm
                 ON hm.household_id = hr.household_id AND hm.user_id = hr.shared_by_user_id
               WHERE hr.household_id = ?
               ORDER BY hr.shared_at ASC""",
            (household_id,),
        ).fetchall()

    result = []
    for row in rows:
        sharer = {
            "user_id": row["shared_by_user_id"],
            "alias": row["alias"],
            "avatar_letter": row["avatar_letter"],
            "avatar_color": row["avatar_color"],
        }
        d = _household_recipe_row(row, sharer)
        d = _apply_obfuscation(d, current_user.id)
        result.append(d)
    return result


@router.post("/{household_id}/recipes/{recipe_id}", status_code=201)
def share_recipe(household_id: str, recipe_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        _require_member(conn, household_id, current_user.id)

        recipe = conn.execute(
            "SELECT * FROM recipes WHERE id=? AND user_id=?",
            (recipe_id, current_user.id),
        ).fetchone()
        if not recipe:
            raise HTTPException(status_code=403, detail="Recipe not found or not yours")

        existing = conn.execute(
            "SELECT 1 FROM household_recipes WHERE household_id=? AND recipe_id=?",
            (household_id, recipe_id),
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Recipe already shared in this household")

        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """INSERT INTO household_recipes
               (household_id, recipe_id, shared_by_user_id, shared_at, obfuscate_secrets)
               VALUES (?,?,?,?,0)""",
            (household_id, recipe_id, current_user.id, now),
        )
        full_row = conn.execute(
            """SELECT r.*, hr.shared_by_user_id, hr.obfuscate_secrets,
                      hm.alias, hm.avatar_letter, hm.avatar_color
               FROM household_recipes hr
               JOIN recipes r ON hr.recipe_id = r.id
               JOIN household_members hm
                 ON hm.household_id = hr.household_id AND hm.user_id = hr.shared_by_user_id
               WHERE hr.household_id=? AND hr.recipe_id=?""",
            (household_id, recipe_id),
        ).fetchone()

    sharer = {
        "user_id": full_row["shared_by_user_id"],
        "alias": full_row["alias"],
        "avatar_letter": full_row["avatar_letter"],
        "avatar_color": full_row["avatar_color"],
    }
    return _household_recipe_row(full_row, sharer)


@router.delete("/{household_id}/recipes/{recipe_id}", status_code=204)
def unshare_recipe(household_id: str, recipe_id: str, current_user: CurrentUserDep):
    with get_db() as conn:
        _require_member(conn, household_id, current_user.id)
        row = conn.execute(
            "SELECT shared_by_user_id FROM household_recipes WHERE household_id=? AND recipe_id=?",
            (household_id, recipe_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Shared recipe not found")
        if row["shared_by_user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Only the sharer can unshare")
        conn.execute(
            "DELETE FROM household_recipes WHERE household_id=? AND recipe_id=?",
            (household_id, recipe_id),
        )
    return None


@router.patch("/{household_id}/recipes/{recipe_id}")
def update_household_recipe(
    household_id: str, recipe_id: str, body: ObfuscateBody, current_user: CurrentUserDep
):
    with get_db() as conn:
        _require_member(conn, household_id, current_user.id)
        row = conn.execute(
            "SELECT shared_by_user_id FROM household_recipes WHERE household_id=? AND recipe_id=?",
            (household_id, recipe_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Shared recipe not found")
        if row["shared_by_user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Only the sharer can update this setting")
        conn.execute(
            "UPDATE household_recipes SET obfuscate_secrets=? WHERE household_id=? AND recipe_id=?",
            (1 if body.obfuscate_secrets else 0, household_id, recipe_id),
        )
        updated_row = conn.execute(
            """SELECT r.*, hr.shared_by_user_id, hr.obfuscate_secrets,
                      hm.alias, hm.avatar_letter, hm.avatar_color
               FROM household_recipes hr
               JOIN recipes r ON hr.recipe_id = r.id
               JOIN household_members hm
                 ON hm.household_id = hr.household_id AND hm.user_id = hr.shared_by_user_id
               WHERE hr.household_id=? AND hr.recipe_id=?""",
            (household_id, recipe_id),
        ).fetchone()

    sharer = {
        "user_id": updated_row["shared_by_user_id"],
        "alias": updated_row["alias"],
        "avatar_letter": updated_row["avatar_letter"],
        "avatar_color": updated_row["avatar_color"],
    }
    return _household_recipe_row(updated_row, sharer)
