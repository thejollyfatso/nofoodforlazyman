# Shopping router — will handle the shared shopping list.
# Endpoints: GET /shopping, POST /shopping (full rewrite), PATCH /shopping/{id}

from fastapi import APIRouter

router = APIRouter(tags=["Shopping"])
