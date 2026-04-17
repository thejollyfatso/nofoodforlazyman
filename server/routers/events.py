from typing import Annotated, Optional

from fastapi import APIRouter, Header, Query, Request
from fastapi.responses import StreamingResponse

from server.deps import get_current_user
from server.db import get_db
from server.sse_bus import event_generator

router = APIRouter(tags=["Events"])


@router.get("/events")
async def sse_stream(
    request: Request,
    household_id: Optional[str] = Query(default=None),
    token: Optional[str] = Query(default=None),
    authorization: Annotated[Optional[str], Header()] = None,
):
    # EventSource cannot send Authorization headers; fall back to ?token= query param.
    auth_header = authorization or (f"Bearer {token}" if token else None)
    current_user = get_current_user(auth_header)

    if household_id:
        with get_db() as conn:
            row = conn.execute(
                "SELECT role FROM household_members WHERE household_id=? AND user_id=?",
                (household_id, current_user.id),
            ).fetchone()
        if not row:
            # Return 404 as a plain response — can't stream an error
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Household not found")
        channel = f"household:{household_id}"
    else:
        channel = f"user:{current_user.id}"

    return StreamingResponse(
        event_generator(channel, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
