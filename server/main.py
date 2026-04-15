from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from server.db import init_db
from server.routers import auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="nf4lm", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://nf4lm.deleonanddeleon.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth")


@app.get("/health")
def health():
    return {"ok": True, "app": "nf4lm"}


# TODO: wire up remaining routers once implemented
# from server.routers import recipes, shopping, events
# app.include_router(recipes.router, prefix="/recipes")
# app.include_router(shopping.router, prefix="/shopping")
# app.include_router(events.router)
