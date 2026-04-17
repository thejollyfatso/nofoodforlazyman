import asyncio
import json
from collections import defaultdict

_subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)


def publish(channel: str, event: str, data: dict = {}):
    """Sync-safe: call from async route handlers without await."""
    msg = {"event": event, "data": data}
    for q in list(_subscribers.get(channel, [])):
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            pass


async def event_generator(channel: str, request):
    """Async generator that yields SSE-formatted text; cleans up on disconnect."""
    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    _subscribers[channel].append(q)
    try:
        yield ": connected\n\n"
        while True:
            if await request.is_disconnected():
                break
            try:
                msg = await asyncio.wait_for(q.get(), timeout=25)
                yield f"event: {msg['event']}\ndata: {json.dumps(msg['data'])}\n\n"
            except asyncio.TimeoutError:
                yield ": keepalive\n\n"
    finally:
        try:
            _subscribers[channel].remove(q)
        except ValueError:
            pass
