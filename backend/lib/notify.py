"""Notification writer used across routers (likes, comments, follows, new episodes)."""
import uuid
from datetime import datetime, timezone

from lib.db import db


async def notify(
    user_id: str,
    type: str,
    actor: dict,
    text: str,
    publication: dict | None = None,
) -> None:
    """Insert a notification. Never notifies the actor about their own action."""
    if not user_id or user_id == actor.get("id"):
        return
    pub = publication or {}
    await db.notifications.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": type,  # follow | like | comment | reply | episode
            "actor_id": actor.get("id", ""),
            "actor_name": actor.get("name", ""),
            "actor_avatar": actor.get("avatar_url", ""),
            "publication_id": pub.get("id"),
            "publication_type": pub.get("type", ""),
            "publication_title": pub.get("title", ""),
            "text": text,
            "read": False,
            "created_at": datetime.now(timezone.utc),
        }
    )
