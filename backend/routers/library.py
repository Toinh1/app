"""Library: saved items, liked items, playlists and playback history."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_user
from lib.db import db
from lib.dates import aware
from lib.queries import decorate_publications
from models.content import (
    HistoryEntry,
    LibraryPayload,
    PlaylistCreate,
    PlaylistItemAdd,
    PlaylistOut,
)
from models.social import MessageOut

router = APIRouter(tags=["library"])


async def _playlist_out(pl: dict, user_id: str | None) -> PlaylistOut:
    owner = await db.users.find_one({"id": pl.get("owner_id", "")}) or {}
    pub_ids = pl.get("publication_ids", [])
    pub_docs = (
        await db.publications.find({"id": {"$in": pub_ids}}).to_list(len(pub_ids))
        if pub_ids
        else []
    )
    by_id = {d["id"]: d for d in pub_docs}
    ordered = [by_id[i] for i in pub_ids if i in by_id]
    items = await decorate_publications(ordered, user_id)
    return PlaylistOut(
        id=pl["id"],
        title=pl.get("title", ""),
        is_public=pl.get("is_public", True),
        owner_id=pl.get("owner_id", ""),
        owner_name=owner.get("name", ""),
        items=items,
        created_at=aware(pl.get("created_at")),
    )


async def _build_library(user: dict) -> LibraryPayload:
    saved_docs = await db.saved.find({"user_id": user["id"]}).sort("created_at", -1).to_list(200)
    like_docs = await db.likes.find(
        {"user_id": user["id"], "target_type": "publication"}
    ).sort("created_at", -1).to_list(200)
    saved_ids = [d["publication_id"] for d in saved_docs]
    liked_ids = [d["target_id"] for d in like_docs]
    saved_pubs = (
        await db.publications.find({"id": {"$in": saved_ids}}).to_list(len(saved_ids))
        if saved_ids
        else []
    )
    liked_pubs = (
        await db.publications.find({"id": {"$in": liked_ids}}).to_list(len(liked_ids))
        if liked_ids
        else []
    )
    by_id = {d["id"]: d for d in saved_pubs}
    saved_ordered = [by_id[i] for i in saved_ids if i in by_id]
    by_id_l = {d["id"]: d for d in liked_pubs}
    liked_ordered = [by_id_l[i] for i in liked_ids if i in by_id_l]

    pl_docs = await db.playlists.find({"owner_id": user["id"]}).sort("created_at", -1).to_list(50)
    playlists = [await _playlist_out(pl, user["id"]) for pl in pl_docs]

    history_docs = await db.history.find({"user_id": user["id"]}).sort("updated_at", -1).to_list(30)
    history: list[HistoryEntry] = []
    for h in history_docs:
        pub_doc = await db.publications.find_one({"id": h["publication_id"]})
        if not pub_doc:
            continue
        entries = await decorate_publications([pub_doc], user["id"])
        history.append(
            HistoryEntry(
                publication=entries[0],
                position_sec=h.get("position_sec", 0),
                updated_at=aware(h.get("updated_at")),
            )
        )

    return LibraryPayload(
        saved=await decorate_publications(saved_ordered, user["id"]),
        liked=await decorate_publications(liked_ordered, user["id"]),
        playlists=playlists,
        history=history,
    )


@router.get("/library", response_model=LibraryPayload)
async def get_library(user: dict = Depends(require_user)):
    return await _build_library(user)


@router.post("/playlists", response_model=PlaylistOut, status_code=201)
async def create_playlist(input: PlaylistCreate, user: dict = Depends(require_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "title": input.title.strip(),
        "is_public": input.is_public,
        "owner_id": user["id"],
        "publication_ids": [],
        "created_at": datetime.now(timezone.utc),
    }
    await db.playlists.insert_one(doc)
    return await _playlist_out(doc, user["id"])


@router.get("/playlists/{playlist_id}", response_model=PlaylistOut)
async def get_playlist(playlist_id: str, user: dict = Depends(require_user)):
    pl = await db.playlists.find_one({"id": playlist_id})
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist não encontrada.")
    if not pl.get("is_public") and pl.get("owner_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Playlist privada.")
    return await _playlist_out(pl, user["id"])


@router.post("/playlists/{playlist_id}/items", response_model=PlaylistOut)
async def add_playlist_item(playlist_id: str, input: PlaylistItemAdd, user: dict = Depends(require_user)):
    pl = await db.playlists.find_one({"id": playlist_id})
    if not pl or pl.get("owner_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Playlist não encontrada.")
    pub = await db.publications.find_one({"id": input.publication_id})
    if not pub:
        raise HTTPException(status_code=404, detail="Conteúdo não encontrado.")
    if input.publication_id not in pl.get("publication_ids", []):
        await db.playlists.update_one(
            {"id": playlist_id},
            {"$push": {"publication_ids": input.publication_id}},
        )
    fresh = await db.playlists.find_one({"id": playlist_id})
    return await _playlist_out(fresh, user["id"])


@router.delete("/playlists/{playlist_id}/items/{pub_id}", response_model=PlaylistOut)
async def remove_playlist_item(playlist_id: str, pub_id: str, user: dict = Depends(require_user)):
    pl = await db.playlists.find_one({"id": playlist_id})
    if not pl or pl.get("owner_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Playlist não encontrada.")
    await db.playlists.update_one(
        {"id": playlist_id}, {"$pull": {"publication_ids": pub_id}}
    )
    fresh = await db.playlists.find_one({"id": playlist_id})
    return await _playlist_out(fresh, user["id"])


@router.delete("/playlists/{playlist_id}", response_model=MessageOut)
async def delete_playlist(playlist_id: str, user: dict = Depends(require_user)):
    pl = await db.playlists.find_one({"id": playlist_id})
    if not pl or pl.get("owner_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Playlist não encontrada.")
    await db.playlists.delete_one({"id": playlist_id})
    return MessageOut(message="Playlist removida.")
