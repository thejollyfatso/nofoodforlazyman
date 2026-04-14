# Auth router — will handle magic link / OTP email authentication.
# Endpoints: POST /auth/magic, POST /auth/verify

from fastapi import APIRouter

router = APIRouter()
