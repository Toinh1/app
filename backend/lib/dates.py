"""Server-side date helpers. The pod clock is UTC — anchor "today" here, never in the browser."""

import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def aware(dt: datetime | None) -> datetime | None:
    """Normalize a (naive) datetime read from Mongo to aware UTC so Pydantic serializes
    with an offset and JavaScript `new Date(...)` parses it correctly."""
    if dt is None or dt.tzinfo is not None:
        return dt
    return dt.replace(tzinfo=timezone.utc)


def today_iso(tz: str | None = None) -> str:
    """Today's date as YYYY-MM-DD in `tz` (default: APP_TZ env, else UTC)."""
    zone = tz or os.environ.get("APP_TZ", "UTC")
    return datetime.now(ZoneInfo(zone)).strftime("%Y-%m-%d")
