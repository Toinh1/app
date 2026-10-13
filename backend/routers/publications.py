"""Publications: unified feed for videocasts, podcast episodes, relatos and debates."""
import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from lib.auth import get_current_user, require_user
from lib.db import db
from lib.dates import aware
from lib.notify import notify
from lib.queries import decorate_publications, fetch_publication_page
from models.content import PublicationCreate, PublicationList, PublicationOut, PublicationUpdate
from models.social import MessageOut, ToggleLikeOut, ToggleSaveOut, ViewOut

router = APIRouter(tags=["publications"])


def _regex(q: str):
    return re.compile(re.escape(q.strip()), re.IGNORECASE)


@router.get("/publications", response_model=PublicationList)
async def list_publications(
    type: str | None = Query(None),
    category: str | None = Query(None),
    q: str | None = Query(None),
    tab: str = Query("foryou"),
    author_id: str | None = Query(None),
    program_id: str | None = Query(None),
    status: str = Query("published"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=48),
    user: dict | None = Depends(get_current_user),
):
    query: dict = {}
    if author_id:
        query["author_id"] = author_id
        # only the author (or an admin) may list drafts
        is_owner = bool(user and (user["id"] == author_id or user.get("role") == "admin"))
        if not is_owner:
            query["status"] = "published"
        elif status in ("published", "draft"):
            query["status"] = status
    else:
        query["status"] = "published"

    if type:
        query["type"] = type
    if category:
        query["category"] = category
    if program_id:
        query["program_id"] = program_id
    if q and q.strip():
        rx = _regex(q)
        query["$or"] = [
            {"title": rx},
            {"description": rx},
            {"tags": rx},
            {"author_name": rx},
        ]

    if tab == "following":
        if not user:
            return PublicationList()
        follows = await db.follows.find(
            {"follower_id": user["id"], "target_type": "user"}
        ).to_list(1000)
        followed_ids = [f["target_id"] for f in follows]
        if not followed_ids:
            return PublicationList()
        query["author_id"] = {"$in": followed_ids}
        query["status"] = "published"
        tab = "recent"

    return await fetch_publication_page(query, tab, page, limit, user["id"] if user else None)


@router.post("/publications", response_model=PublicationOut, status_code=201)
async def create_publication(input: PublicationCreate, user: dict = Depends(require_user)):
    doc = input.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["author_id"] = user["id"]
    doc["author_name"] = user.get("name", "")
    doc["author_avatar"] = user.get("avatar_url", "")
    doc["views"] = 0
    doc["likes_count"] = 0
    doc["comments_count"] = 0
    doc["resolved"] = False
    doc["is_demo"] = False
    doc["created_at"] = datetime.now(timezone.utc)
    doc["program_title"] = ""
    doc["episode_number"] = None

    if input.type == "podcast" and input.program_id:
        program = await db.programs.find_one({"id": input.program_id})
        if not program:
            raise HTTPException(status_code=404, detail="Programa não encontrado.")
        if program.get("host_id") != user["id"] and user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Apenas o apresentador pode publicar neste programa.")
        doc["program_title"] = program.get("title", "")
        doc["episode_number"] = (
            await db.publications.count_documents({"program_id": input.program_id})
        ) + 1
        if not doc.get("cover_url") and program.get("cover_url"):
            doc["cover_url"] = program["cover_url"]

    if input.type in ("relato", "debate") and not doc.get("media_url"):
        doc["media_kind"] = "text"

    await db.publications.insert_one(doc)

    # notify program followers about the new episode
    if doc["status"] == "published" and doc["type"] == "podcast" and doc["program_id"]:
        followers = await db.follows.find(
            {"target_id": doc["program_id"], "target_type": "program"}
        ).to_list(1000)
        for f in followers:
            await notify(
                f["follower_id"], "episode", user,
                f"Novo episódio de “{doc['program_title']}”: {doc['title']}", doc,
            )

    decorated = await decorate_publications([doc], user["id"])
    return decorated[0]


async def _get_pub_or_404(pub_id: str) -> dict:
    doc = await db.publications.find_one({"id": pub_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Conteúdo não encontrado.")
    return doc


@router.get("/publications/{pub_id}", response_model=PublicationOut)
async def get_publication(pub_id: str, user: dict | None = Depends(get_current_user)):
    doc = await _get_pub_or_404(pub_id)
    if doc.get("status") == "draft":
        allowed = user and (user["id"] == doc["author_id"] or user.get("role") == "admin")
        if not allowed:
            raise HTTPException(status_code=404, detail="Conteúdo não encontrado.")
    decorated = await decorate_publications([doc], user["id"] if user else None)
    return decorated[0]


@router.patch("/publications/{pub_id}", response_model=PublicationOut)
async def update_publication(pub_id: str, input: PublicationUpdate, user: dict = Depends(require_user)):
    doc = await _get_pub_or_404(pub_id)
    if doc["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Você só pode editar o seu conteúdo.")
    updates = input.model_dump(exclude_none=True, exclude_unset=True)
    if updates:
        await db.publications.update_one({"id": pub_id}, {"$set": updates})
    fresh = await _get_pub_or_404(pub_id)
    decorated = await decorate_publications([fresh], user["id"])
    return decorated[0]


@router.delete("/publications/{pub_id}", response_model=MessageOut)
async def delete_publication(pub_id: str, user: dict = Depends(require_user)):
    doc = await _get_pub_or_404(pub_id)
    if doc["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Você só pode excluir o seu conteúdo.")
    await db.publications.delete_one({"id": pub_id})
    await db.comments.delete_many({"publication_id": pub_id})
    await db.likes.delete_many({"target_id": pub_id})
    await db.saved.delete_many({"publication_id": pub_id})
    await db.history.delete_many({"publication_id": pub_id})
    return MessageOut(message="Conteúdo removido.")


@router.post("/publications/{pub_id}/view", response_model=ViewOut)
async def register_view(pub_id: str):
    await db.publications.update_one({"id": pub_id}, {"$inc": {"views": 1}})
    doc = await _get_pub_or_404(pub_id)
    return ViewOut(views=doc.get("views", 0))


@router.post("/publications/{pub_id}/like", response_model=ToggleLikeOut)
async def toggle_like(pub_id: str, user: dict = Depends(require_user)):
    doc = await _get_pub_or_404(pub_id)
    existing = await db.likes.find_one(
        {"user_id": user["id"], "target_id": pub_id, "target_type": "publication"}
    )
    if existing:
        await db.likes.delete_one({"id": existing["id"]})
        await db.publications.update_one({"id": pub_id}, {"$inc": {"likes_count": -1}})
        liked = False
    else:
        await db.likes.insert_one(
            {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "target_id": pub_id,
                "target_type": "publication",
                "created_at": datetime.now(timezone.utc),
            }
        )
        await db.publications.update_one({"id": pub_id}, {"$inc": {"likes_count": 1}})
        liked = True
        await notify(doc["author_id"], "like", user, f"{user['name']} curtiu “{doc['title']}”.", doc)
    fresh = await _get_pub_or_404(pub_id)
    return ToggleLikeOut(liked=liked, likes_count=max(0, fresh.get("likes_count", 0)))


@router.post("/publications/{pub_id}/save", response_model=ToggleSaveOut)
async def toggle_save(pub_id: str, user: dict = Depends(require_user)):
    await _get_pub_or_404(pub_id)
    existing = await db.saved.find_one({"user_id": user["id"], "publication_id": pub_id})
    if existing:
        await db.saved.delete_one({"id": existing["id"]})
        return ToggleSaveOut(saved=False)
    await db.saved.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "publication_id": pub_id,
            "created_at": datetime.now(timezone.utc),
        }
    )
    return ToggleSaveOut(saved=True)


@router.get("/publications/{pub_id}/related", response_model=PublicationList)
async def related_publications(pub_id: str, user: dict | None = Depends(get_current_user)):
    doc = await _get_pub_or_404(pub_id)
    query = {
        "id": {"$ne": pub_id},
        "status": "published",
        "$or": [{"category": doc.get("category", "")}, {"type": doc.get("type", "")}],
    }
    docs = (
        await db.publications.find(query)
        .sort("views", -1)
        .limit(8)
        .to_list(8)
    )
    items = await decorate_publications(docs, user["id"] if user else None)
    return PublicationList(items=items, total=len(items), has_more=False)


@router.post("/history", response_model=MessageOut)
async def save_progress(
    publication_id: str,
    position_sec: float = 0,
    user: dict = Depends(require_user),
):
    """Upsert playback progress (audio/video). Query-param convenience endpoint."""
    if not await db.publications.find_one({"id": publication_id}):
        raise HTTPException(status_code=404, detail="Conteúdo não encontrado.")
    await db.history.update_one(
        {"user_id": user["id"], "publication_id": publication_id},
        {"$set": {"position_sec": position_sec, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return MessageOut(message="Progresso salvo.")
