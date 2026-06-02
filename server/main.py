import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

import jwt as _jwt
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

import server.db as _db
from server.db import cleanup_stale_demo_dbs, init_db
from server.routers import auth, events, households, meal_planning, recipe_books, recipes, shopping


class DemoDBMiddleware:
    """Sets _demo_db_path ContextVar in the async task before route handlers run.

    Must be a raw ASGI middleware (not BaseHTTPMiddleware) so that ContextVar
    changes propagate to worker threads spawned by run_in_threadpool.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = {k: v for k, v in scope.get("headers", [])}
            auth_header = headers.get(b"authorization", b"").decode()
            if auth_header.startswith("Bearer "):
                token = auth_header.removeprefix("Bearer ")
                secret = os.getenv("BETTER_AUTH_SECRET", "")
                try:
                    payload = _jwt.decode(token, secret, algorithms=["HS256"])
                    if payload.get("demo") and payload.get("demo_db"):
                        session_id = payload["demo_db"]
                        _db._demo_db_path.set(
                            f"{_db.DEMO_DB_DIR}/{_db.DEMO_DB_PREFIX}{session_id}.db"
                        )
                except Exception:
                    pass
        await self.app(scope, receive, send)

DIST_DIR = Path(__file__).parent.parent / "client" / "dist"
ALLOWED_ORIGINS = ["https://nf4lm.deleonanddeleon.com"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    cleanup_stale_demo_dbs()
    yield


app = FastAPI(title="nf4lm", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(DemoDBMiddleware)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
    )

app.include_router(auth.router, prefix="/auth")
app.include_router(households.router, prefix="/households")
app.include_router(recipes.router, prefix="/recipes")
app.include_router(recipe_books.router, prefix="/recipe-books")
app.include_router(shopping.router)
app.include_router(meal_planning.router)
app.include_router(events.router)


@app.get("/health")
def health():
    return {"ok": True, "app": "nf4lm"}

if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")
