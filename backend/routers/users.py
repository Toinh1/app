"""User profiles, follow graph and per-user content."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from lib.auth import get_current_user, hash_password, require_user, verify_password
from lib.db import db
from lib.dates import aware
from lib.queries import decorate_publications, fetch_publication_page
from lib.notify import notify
from models.content import PublicationList
from models.social import MessageOut, ToggleFollowOut
from models.users import PasswordChange, ProfileMini, ProfileOut, ProfileUpdate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


async def _counts(user_id: str) -> dict:
    followers = await db.follows.count_documents({"target_id": user_id, "target_type": "user"})
    following = await db.follows.count_documents({"follower_id": user_id, "target_type": "user"})
    pubs = await db.publications.count_documents({"author_id": user_id, "status": "published"})
    return {"followers_count": followers, "following_count": following, "publications_count": pubs}


@router.get("/{user_id}", response_model=ProfileOut)
async def get_profile(user_id: str, viewer: dict | None = Depends(get_current_user)):
    doc = await db.users.find_one({"id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Perfil não encontrado.")
    counts = await _counts(user_id)
    is_following = False
    if viewer:
        is_following = bool(
            await db.follows.find_one(
                {"follower_id": viewer["id"], "target_id": user_id, "target_type": "user"}
            )
        )
    return ProfileOut(
        id=doc.get("id", user_id),
        name=doc.get("name", ""),
        avatar_url=doc.get("avatar_url", ""),
        bio=doc.get("bio", ""),
        institution=doc.get("institution", ""),
        area=doc.get("area", ""),
        semester=doc.get("semester", ""),
        linkedin=doc.get("linkedin", ""),
        role=doc.get("role", "user"),
        created_at=aware(doc.get("created_at")),
        is_following=is_following,
        is_me=bool(viewer and viewer["id"] == user_id),
        **counts,
    )


@router.patch("/me", response_model=UserOut)
async def update_me(input: ProfileUpdate, user: dict = Depends(require_user)):
    updates = input.model_dump(exclude_none=True, exclude_unset=True)
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    doc = await db.users.find_one({"id": user["id"]})
    return UserOut(
        id=doc.get("id", ""),
        name=doc.get("name", ""),
        email=doc.get("email", ""),
        role=doc.get("role", "user"),
        bio=doc.get("bio", ""),
        institution=doc.get("institution", ""),
        area=doc.get("area", ""),
        semester=doc.get("semester", ""),
        avatar_url=doc.get("avatar_url", ""),
        linkedin=doc.get("linkedin", ""),
        created_at=aware(doc.get("created_at")),
    )


@router.post("/me/password", response_model=MessageOut)
async def change_password(input: PasswordChange, user: dict = Depends(require_user)):
    if not verify_password(input.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Senha atual incorreta.")
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"password_hash": hash_password(input.new_password)}}
    )
    return MessageOut(message="Senha alterada com sucesso.")


@router.post("/{user_id}/follow", response_model=ToggleFollowOut)
async def toggle_follow(user_id: str, user: dict = Depends(require_user)):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Você não pode seguir a si mesmo.")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    existing = await db.follows.find_one(
        {"follower_id": user["id"], "target_id": user_id, "target_type": "user"}
    )
    if existing:
        await db.follows.delete_one({"id": existing["id"]})
        following = False
    else:
        await db.follows.insert_one(
            {
                "id": str(uuid.uuid4()),
                "follower_id": user["id"],
                "target_id": user_id,
                "target_type": "user",
                "created_at": datetime.now(timezone.utc),
            }
        )
        following = True
        await notify(user_id, "follow", user, f"{user['name']} começou a seguir você.")
    followers = await db.follows.count_documents({"target_id": user_id, "target_type": "user"})
    return ToggleFollowOut(following=following, followers_count=followers)


@router.get("/{user_id}/publications", response_model=PublicationList)
async def user_publications(
    user_id: str,
    type: str | None = Query(None),
    status: str = Query("published"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=48),
    viewer: dict | None = Depends(get_current_user),
):
    query: dict = {"author_id": user_id}
    is_me = bool(viewer and viewer["id"] == user_id)
    if status in ("published", "draft", "all") and is_me:
        if status != "all":
            query["status"] = status
    else:
        query["status"] = "published"
    if type:
        query["type"] = type
    return await fetch_publication_page(query, "recent", page, limit, viewer["id"] if viewer else None)


@router.get("/{user_id}/followers", response_model=list[ProfileMini])
async def list_followers(user_id: str):
    docs = await db.follows.find({"target_id": user_id, "target_type": "user"}).to_list(500)
    ids = [d["follower_id"] for d in docs]
    users = await db.users.find({"id": {"$in": ids}}).to_list(len(ids))
    return [
        ProfileMini(
            id=u.get("id", ""),
            name=u.get("name", ""),
            avatar_url=u.get("avatar_url", ""),
            institution=u.get("institution", ""),
            area=u.get("area", ""),
        )
        for u in users
    ]


@router.get("/{user_id}/following", response_model=list[ProfileMini])
async def list_following(user_id: str):
    docs = await db.follows.find({"follower_id": user_id, "target_type": "user"}).to_list(500)
    ids = [d["target_id"] for d in docs]
    users = await db.users.find({"id": {"$in": ids}}).to_list(len(ids))
    return [
        ProfileMini(
            id=u.get("id", ""),
            name=u.get("name", ""),
            avatar_url=u.get("avatar_url", ""),
            institution=u.get("institution", ""),
            area=u.get("area", ""),
        )
        for u in users
    ]


@router.get("/{user_id}/playlists")
async def public_playlists(user_id: str, viewer: dict | None = Depends(get_current_user)):
    is_me = bool(viewer and viewer["id"] == user_id)
    query = {"owner_id": user_id} if is_me else {"owner_id": user_id, "is_public": True}
    docs = await db.playlists.find(query).sort("created_at", -1).to_list(50)
    owner = await db.users.find_one({"id": user_id}) or {}
    out = []
    for pl in docs:
        pub_ids = pl.get("publication_ids", [])
        pub_docs = (
            await db.publications.find({"id": {"$in": pub_ids}}).to_list(len(pub_ids))
            if pub_ids
            else []
        )
        by_id = {d["id"]: d for d in pub_docs}
        from models.content import PlaylistOut

        out.append(
            PlaylistOut(
                id=pl["id"],
                title=pl.get("title", ""),
                is_public=pl.get("is_public", True),
                owner_id=user_id,
                owner_name=owner.get("name", ""),
                items=[
                    p
                    for p in await decorate_publications(
                        [by_id[i] for i in pub_ids if i in by_id], viewer["id"] if viewer else None
                    )
                ],
                created_at=aware(pl.get("created_at")),
            )
        )
    return out
