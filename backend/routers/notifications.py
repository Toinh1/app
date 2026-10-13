"""User notifications: list, mark read, mark all read."""
from fastapi import APIRouter, Depends

from lib.auth import require_user
from lib.db import db
from lib.dates import aware
from models.social import MessageOut, NotificationList, NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationList)
async def list_notifications(user: dict = Depends(require_user)):
    docs = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).to_list(50)
    items = [
        NotificationOut(
            id=d["id"],
            type=d.get("type", ""),
            actor_id=d.get("actor_id", ""),
            actor_name=d.get("actor_name", ""),
            actor_avatar=d.get("actor_avatar", ""),
            publication_id=d.get("publication_id"),
            publication_type=d.get("publication_type", ""),
            publication_title=d.get("publication_title", ""),
            text=d.get("text", ""),
            read=d.get("read", False),
            created_at=aware(d.get("created_at")),
        )
        for d in docs
    ]
    unread = sum(1 for i in items if not i.read)
    return NotificationList(items=items, unread=unread)


@router.post("/{notification_id}/read", response_model=MessageOut)
async def mark_read(notification_id: str, user: dict = Depends(require_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]}, {"$set": {"read": True}}
    )
    return MessageOut(message="Notificação marcada como lida.")


@router.post("/read-all", response_model=MessageOut)
async def mark_all_read(user: dict = Depends(require_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return MessageOut(message="Todas as notificações foram marcadas como lidas.")
