import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.getenv("DATABASE_URL", "./nf4lm.db")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


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


def init_db():
    with get_db() as conn:
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
        """)
