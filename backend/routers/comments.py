"""Comments and replies on publications (used by videos, podcasts, relatos and debates)."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from lib.auth import get_current_user, require_user
from lib.db import db
from lib.dates import aware
from lib.notify import notify
from models.social import CommentCreate, CommentOut, ToggleLikeOut

router = APIRouter(tags=["comments"])


async def _decorate(docs: list[dict], user_id: str | None) -> list[CommentOut]:
    ids = [d["id"] for d in docs]
    liked: set[str] = set()
    if user_id and ids:
        like_docs = await db.likes.find(
            {"user_id": user_id, "target_type": "comment", "target_id": {"$in": ids}}
        ).to_list(len(ids))
        liked = {d["target_id"] for d in like_docs}
    out = []
    for doc in docs:
        c = CommentOut(
            id=doc["id"],
            publication_id=doc["publication_id"],
            parent_id=doc.get("parent_id"),
            author_id=doc.get("author_id", ""),
            author_name=doc.get("author_name", ""),
            author_avatar=doc.get("author_avatar", ""),
            text=doc.get("text", ""),
            likes_count=doc.get("likes_count", 0),
            created_at=aware(doc.get("created_at")),
            liked_by_me=doc["id"] in liked,
        )
        out.append(c)
    return out


@router.get("/publications/{pub_id}/comments", response_model=list[CommentOut])
async def list_comments(
    pub_id: str,
    sort: str = Query("relevant"),
    user: dict | None = Depends(get_current_user),
):
    docs = await db.comments.find({"publication_id": pub_id}).to_list(600)
    if sort == "recent":
        docs.sort(key=lambda d: d.get("created_at") or datetime.min, reverse=True)
    else:  # relevant: most liked first, newest as tiebreak
        docs.sort(key=lambda d: (d.get("likes_count", 0),), reverse=True)
    return await _decorate(docs, user["id"] if user else None)


@router.post("/publications/{pub_id}/comments", response_model=CommentOut, status_code=201)
async def create_comment(pub_id: str, input: CommentCreate, user: dict = Depends(require_user)):
    pub = await db.publications.find_one({"id": pub_id})
    if not pub:
        raise HTTPException(status_code=404, detail="Conteúdo não encontrado.")

    parent = None
    if input.parent_id:
        parent = await db.comments.find_one({"id": input.parent_id, "publication_id": pub_id})
        if not parent:
            raise HTTPException(status_code=404, detail="Comentário original não encontrado.")

    doc = {
        "id": str(uuid.uuid4()),
        "publication_id": pub_id,
        "parent_id": input.parent_id,
        "author_id": user["id"],
        "author_name": user.get("name", ""),
        "author_avatar": user.get("avatar_url", ""),
        "text": input.text.strip(),
        "likes_count": 0,
        "created_at": datetime.now(timezone.utc),
    }
    await db.comments.insert_one(doc)
    await db.publications.update_one({"id": pub_id}, {"$inc": {"comments_count": 1}})

    if parent:
        await notify(
            parent["author_id"], "reply", user,
            f"{user['name']} respondeu seu comentário em “{pub['title']}”.", pub,
        )
    else:
        await notify(
            pub["author_id"], "comment", user,
            f"{user['name']} comentou em “{pub['title']}”.", pub,
        )
    return (await _decorate([doc], user["id"]))[0]


@router.post("/comments/{comment_id}/like", response_model=ToggleLikeOut)
async def like_comment(comment_id: str, user: dict = Depends(require_user)):
    doc = await db.comments.find_one({"id": comment_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Comentário não encontrado.")
    existing = await db.likes.find_one(
        {"user_id": user["id"], "target_id": comment_id, "target_type": "comment"}
    )
    if existing:
        await db.likes.delete_one({"id": existing["id"]})
        await db.comments.update_one({"id": comment_id}, {"$inc": {"likes_count": -1}})
        liked = False
    else:
        await db.likes.insert_one(
            {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "target_id": comment_id,
                "target_type": "comment",
                "created_at": datetime.now(timezone.utc),
            }
        )
        await db.comments.update_one({"id": comment_id}, {"$inc": {"likes_count": 1}})
        liked = True
        pub = await db.publications.find_one({"id": doc["publication_id"]})
        await notify(doc["author_id"], "like", user, f"{user['name']} curtiu seu comentário.", pub)
    fresh = await db.comments.find_one({"id": comment_id})
    return ToggleLikeOut(liked=liked, likes_count=max(0, fresh.get("likes_count", 0)))


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(require_user)):
    doc = await db.comments.find_one({"id": comment_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Comentário não encontrado.")
    if doc["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Você só pode excluir os seus comentários.")
    await db.comments.delete_one({"id": comment_id})
    await db.comments.delete_many({"parent_id": comment_id})
    await db.publications.update_one({"id": doc["publication_id"]}, {"$inc": {"comments_count": -1}})
    return {"message": "Comentário removido."}
