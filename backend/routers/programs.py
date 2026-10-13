"""Podcast programs (shows) with hosts, covers, episodes and followers."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import get_current_user, require_user
from lib.db import db
from lib.dates import aware
from lib.queries import decorate_publications
from lib.notify import notify
from models.content import ProgramCreate, ProgramDetail, ProgramOut

router = APIRouter(prefix="/programs", tags=["programs"])


async def program_out(doc: dict, user_id: str | None) -> ProgramOut:
    host = await db.users.find_one({"id": doc.get("host_id", "")}) or {}
    episodes_count = await db.publications.count_documents({"program_id": doc["id"]})
    followers_count = await db.follows.count_documents(
        {"target_id": doc["id"], "target_type": "program"}
    )
    is_following = False
    if user_id:
        is_following = bool(
            await db.follows.find_one(
                {"follower_id": user_id, "target_id": doc["id"], "target_type": "program"}
            )
        )
    return ProgramOut(
        id=doc["id"],
        title=doc.get("title", ""),
        description=doc.get("description", ""),
        cover_url=doc.get("cover_url", ""),
        host_id=doc.get("host_id", ""),
        host_name=host.get("name", ""),
        host_avatar=host.get("avatar_url", ""),
        episodes_count=episodes_count,
        followers_count=followers_count,
        is_following=is_following,
        created_at=aware(doc.get("created_at")),
    )


@router.get("", response_model=list[ProgramOut])
async def list_programs(user: dict | None = Depends(get_current_user)):
    docs = await db.programs.find().sort("created_at", -1).to_list(50)
    user_id = user["id"] if user else None
    return [await program_out(d, user_id) for d in docs]


@router.post("", response_model=ProgramOut, status_code=201)
async def create_program(input: ProgramCreate, user: dict = Depends(require_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "title": input.title.strip(),
        "description": input.description,
        "cover_url": input.cover_url,
        "host_id": user["id"],
        "created_at": datetime.now(timezone.utc),
    }
    await db.programs.insert_one(doc)
    return await program_out(doc, user["id"])


@router.get("/{program_id}", response_model=ProgramDetail)
async def get_program(program_id: str, user: dict | None = Depends(get_current_user)):
    doc = await db.programs.find_one({"id": program_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Programa não encontrado.")
    out = await program_out(doc, user["id"] if user else None)
    episode_docs = (
        await db.publications.find({"program_id": program_id, "status": "published"})
        .sort("episode_number", 1)
        .to_list(200)
    )
    episodes = await decorate_publications(episode_docs, user["id"] if user else None)
    return ProgramDetail(**out.model_dump(), episodes=episodes)


@router.post("/{program_id}/follow")
async def toggle_program_follow(program_id: str, user: dict = Depends(require_user)):
    program = await db.programs.find_one({"id": program_id})
    if not program:
        raise HTTPException(status_code=404, detail="Programa não encontrado.")
    existing = await db.follows.find_one(
        {"follower_id": user["id"], "target_id": program_id, "target_type": "program"}
    )
    if existing:
        await db.follows.delete_one({"id": existing["id"]})
        following = False
    else:
        await db.follows.insert_one(
            {
                "id": str(uuid.uuid4()),
                "follower_id": user["id"],
                "target_id": program_id,
                "target_type": "program",
                "created_at": datetime.now(timezone.utc),
            }
        )
        following = True
        await notify(
            program.get("host_id", ""), "follow", user,
            f"{user['name']} seguiu o programa “{program['title']}”.",
        )
    followers_count = await db.follows.count_documents(
        {"target_id": program_id, "target_type": "program"}
    )
    return {"following": following, "followers_count": followers_count}
