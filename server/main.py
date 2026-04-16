from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from server.db import init_db
from server.routers import auth, households, recipes

DIST_DIR = Path(__file__).parent.parent / "client" / "dist"
ALLOWED_ORIGINS = ["https://nf4lm.deleonanddeleon.com"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="nf4lm", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/health")
def health():
    return {"ok": True, "app": "nf4lm"}


# TODO: wire up remaining routers once implemented
# from server.routers import shopping, events
# app.include_router(shopping.router, prefix="/shopping")
# app.include_router(events.router)

if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")
