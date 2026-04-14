from fastapi import FastAPI

app = FastAPI(title="nf4lm")


@app.get("/health")
def health():
    return {"ok": True, "app": "nf4lm"}


# TODO: wire up routers once implemented
# from server.routers import auth, recipes, shopping, events
# app.include_router(auth.router, prefix="/auth")
# app.include_router(recipes.router, prefix="/recipes")
# app.include_router(shopping.router, prefix="/shopping")
# app.include_router(events.router)

# TODO: mount static files for production
# from fastapi.staticfiles import StaticFiles
# app.mount("/", StaticFiles(directory="client/dist", html=True), name="static")
