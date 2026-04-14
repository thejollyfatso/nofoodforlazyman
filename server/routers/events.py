# Events router — will handle SSE stream for real-time updates.
# Endpoint: GET /events
# Events emitted: recipes_changed, shopping_changed
# Note: this endpoint must never be cached by the service worker.

from fastapi import APIRouter

router = APIRouter()
