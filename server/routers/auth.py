import os
import secrets
import string
from datetime import datetime, timedelta, timezone

import jwt
import resend
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from server.db import get_db

router = APIRouter()

SECRET = os.getenv("BETTER_AUTH_SECRET", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_ADDRESS = os.getenv("EMAIL_FROM", "No Food for Lazy Man <noreply@deleonanddeleon.com>")
OTP_TTL_MINUTES = 10
TOKEN_TTL_DAYS = 30


class MagicRequest(BaseModel):
    email: str


class VerifyRequest(BaseModel):
    email: str
    code: str


def _generate_otp(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def _issue_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_TTL_DAYS),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


@router.post("/magic")
def request_magic(body: MagicRequest):
    email = body.email.strip().lower()
    code = _generate_otp()
    expires_at = (
        datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)
    ).isoformat()

    with get_db() as conn:
        conn.execute(
            "UPDATE otp_codes SET used=1 WHERE email=? AND used=0",
            (email,),
        )
        conn.execute(
            "INSERT INTO otp_codes (id, email, code, expires_at) VALUES (?,?,?,?)",
            (secrets.token_hex(16), email, code, expires_at),
        )

    resend.api_key = RESEND_API_KEY
    resend.Emails.send(
        {
            "from": FROM_ADDRESS,
            "to": [email],
            "subject": "Your sign-in code for No Food for Lazy Man",
            "html": (
                f"<p>Your sign-in code is <strong style='font-size:24px;letter-spacing:4px'>"
                f"{code}</strong>.</p>"
                f"<p>It expires in {OTP_TTL_MINUTES} minutes. "
                f"If you didn't request this, you can ignore it.</p>"
            ),
        }
    )

    return {"ok": True}


@router.post("/verify")
def verify_magic(body: VerifyRequest):
    email = body.email.strip().lower()
    code = body.code.strip()

    with get_db() as conn:
        row = conn.execute(
            """
            SELECT * FROM otp_codes
            WHERE email=? AND code=? AND used=0
            ORDER BY expires_at DESC
            LIMIT 1
            """,
            (email, code),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="Invalid or expired code")

        expires_at = datetime.fromisoformat(row["expires_at"])
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Code has expired")

        conn.execute("UPDATE otp_codes SET used=1 WHERE id=?", (row["id"],))

        user = conn.execute(
            "SELECT id FROM users WHERE email=?", (email,)
        ).fetchone()
        if user:
            user_id = user["id"]
        else:
            user_id = secrets.token_hex(16)
            conn.execute(
                "INSERT INTO users (id, email) VALUES (?,?)",
                (user_id, email),
            )

    return {"token": _issue_token(user_id, email)}
