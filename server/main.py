import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="nf4lm")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://nf4lm.deleonanddeleon.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "app": "nf4lm"}


# TODO: wire up routers once implemented
# from server.routers import auth, recipes, shopping, events
# app.include_router(auth.router, prefix="/auth")
# app.include_router(recipes.router, prefix="/recipes")
# app.include_router(shopping.router, prefix="/shopping")
# app.include_router(events.router)
