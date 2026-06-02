import glob
import os
import sqlite3
import time
from contextlib import contextmanager
from contextvars import ContextVar

DB_PATH = os.getenv("DATABASE_URL", "./nf4lm.db")
DEMO_DB_DIR = "/tmp"
DEMO_DB_PREFIX = "nf4lm_demo_"
DEMO_DB_TTL_SECONDS = 4 * 60 * 60

_demo_db_path: ContextVar[str | None] = ContextVar("_demo_db_path", default=None)


def _open_conn(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def get_conn() -> sqlite3.Connection:
    return _open_conn(_demo_db_path.get() or DB_PATH)


@contextmanager
def get_db():
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id       TEXT PRIMARY KEY,
            email    TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS otp_codes (
            id         TEXT PRIMARY KEY,
            email      TEXT NOT NULL,
            code       TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used       INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS households (
            id         TEXT PRIMARY KEY,
            name       TEXT NOT NULL,
            created_by TEXT NOT NULL REFERENCES users(id),
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS household_members (
            household_id  TEXT NOT NULL REFERENCES households(id),
            user_id       TEXT NOT NULL REFERENCES users(id),
            role          TEXT NOT NULL CHECK (role IN ('owner', 'member')),
            alias         TEXT,
            avatar_letter TEXT,
            avatar_color  TEXT,
            joined_at     TEXT NOT NULL,
            PRIMARY KEY (household_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS household_invites (
            id               TEXT PRIMARY KEY,
            household_id     TEXT NOT NULL REFERENCES households(id),
            created_by       TEXT NOT NULL REFERENCES users(id),
            token            TEXT NOT NULL UNIQUE,
            created_at       TEXT NOT NULL,
            expires_at       TEXT NOT NULL,
            used_by_user_id  TEXT REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS recipes (
            id                  TEXT PRIMARY KEY,
            user_id             TEXT NOT NULL REFERENCES users(id),
            title               TEXT NOT NULL,
            notes               TEXT NOT NULL DEFAULT '',
            ingredients         TEXT NOT NULL DEFAULT '[]',
            created_at          TEXT NOT NULL,
            updated_at          TEXT NOT NULL,
            copied_from_user_id TEXT,
            copied_from_alias   TEXT
        );

        CREATE TABLE IF NOT EXISTS household_recipes (
            household_id      TEXT NOT NULL REFERENCES households(id),
            recipe_id         TEXT NOT NULL REFERENCES recipes(id),
            shared_by_user_id TEXT NOT NULL REFERENCES users(id),
            shared_at         TEXT NOT NULL,
            obfuscate_secrets INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (household_id, recipe_id)
        );

        CREATE TABLE IF NOT EXISTS shopping_list_items (
            id               TEXT NOT NULL,
            owner_type       TEXT NOT NULL CHECK (owner_type IN ('user', 'household')),
            owner_id         TEXT NOT NULL,
            name             TEXT NOT NULL,
            normalized_name  TEXT NOT NULL,
            quantities       TEXT NOT NULL DEFAULT '[]',
            checked          INTEGER NOT NULL DEFAULT 0,
            checked_by       TEXT,
            source_recipes   TEXT NOT NULL DEFAULT '[]',
            optional         INTEGER NOT NULL DEFAULT 0,
            secret           INTEGER NOT NULL DEFAULT 0,
            assigned_to      TEXT NOT NULL DEFAULT '[]',
            substitutions    TEXT NOT NULL DEFAULT '[]',
            substituted_with TEXT,
            item_order       INTEGER NOT NULL DEFAULT 0,
            item_type        TEXT NOT NULL DEFAULT 'item',
            PRIMARY KEY (owner_type, owner_id, id)
        );

        CREATE INDEX IF NOT EXISTS idx_shopping_owner
            ON shopping_list_items (owner_type, owner_id);

        CREATE TABLE IF NOT EXISTS meal_plan (
            id            TEXT PRIMARY KEY,
            context_type  TEXT NOT NULL CHECK (context_type IN ('personal', 'household')),
            context_id    TEXT NOT NULL,
            name          TEXT NOT NULL,
            planned_date  TEXT NOT NULL,
            persistent    INTEGER NOT NULL DEFAULT 0,
            created_by    TEXT NOT NULL REFERENCES users(id),
            created_at    TEXT NOT NULL,
            notes         TEXT,
            color         TEXT,
            display_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS meal_plan_recipes (
            meal_plan_id TEXT NOT NULL REFERENCES meal_plan(id) ON DELETE CASCADE,
            recipe_id    TEXT NOT NULL REFERENCES recipes(id),
            PRIMARY KEY (meal_plan_id, recipe_id)
        );

        CREATE TABLE IF NOT EXISTS meal_plan_members (
            meal_plan_id TEXT NOT NULL REFERENCES meal_plan(id) ON DELETE CASCADE,
            user_id      TEXT NOT NULL REFERENCES users(id),
            PRIMARY KEY (meal_plan_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS meal_plan_bin (
            id           TEXT PRIMARY KEY,
            context_type TEXT NOT NULL CHECK (context_type IN ('personal', 'household')),
            context_id   TEXT NOT NULL,
            recipe_id    TEXT NOT NULL REFERENCES recipes(id),
            added_by     TEXT NOT NULL REFERENCES users(id),
            added_at     TEXT NOT NULL,
            expires_at   TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_meal_plan_ctx
            ON meal_plan (context_type, context_id);

        CREATE INDEX IF NOT EXISTS idx_meal_plan_bin_ctx
            ON meal_plan_bin (context_type, context_id);

        CREATE TABLE IF NOT EXISTS recipe_books (
            id            TEXT PRIMARY KEY,
            owner_user_id TEXT NOT NULL REFERENCES users(id),
            name          TEXT NOT NULL,
            description   TEXT NOT NULL DEFAULT '',
            created_at    TEXT NOT NULL,
            updated_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recipe_book_recipes (
            book_id    TEXT NOT NULL REFERENCES recipe_books(id) ON DELETE CASCADE,
            recipe_id  TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
            added_at   TEXT NOT NULL,
            PRIMARY KEY (book_id, recipe_id)
        );

        CREATE TABLE IF NOT EXISTS household_shared_books (
            book_id           TEXT NOT NULL REFERENCES recipe_books(id) ON DELETE CASCADE,
            household_id      TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
            shared_by_user_id TEXT NOT NULL REFERENCES users(id),
            shared_at         TEXT NOT NULL,
            PRIMARY KEY (book_id, household_id)
        );

        CREATE INDEX IF NOT EXISTS idx_recipe_book_owner
            ON recipe_books (owner_user_id);
    """)
    for col, definition in [
        ("notes", "TEXT"),
        ("color", "TEXT"),
        ("display_order", "INTEGER NOT NULL DEFAULT 0"),
    ]:
        try:
            conn.execute(f"ALTER TABLE meal_plan ADD COLUMN {col} {definition}")
        except Exception:
            pass
    try:
        conn.execute(
            "ALTER TABLE shopping_list_items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'item'"
        )
    except Exception:
        pass


def init_db():
    with get_db() as conn:
        _init_schema(conn)


def create_demo_db(session_id: str) -> None:
    from server.demo_seed import seed_demo_db

    path = f"{DEMO_DB_DIR}/{DEMO_DB_PREFIX}{session_id}.db"
    conn = _open_conn(path)
    try:
        _init_schema(conn)
        seed_demo_db(conn, f"demo_{session_id}")
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def cleanup_stale_demo_dbs() -> None:
    cutoff = time.time() - DEMO_DB_TTL_SECONDS
    for path in glob.glob(f"{DEMO_DB_DIR}/{DEMO_DB_PREFIX}*.db"):
        try:
            if os.path.getmtime(path) < cutoff:
                os.remove(path)
        except OSError:
            pass
