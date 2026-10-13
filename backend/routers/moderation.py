"""Moderation: user reports + admin panel (users, reports, categories, metrics)."""
import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import get_current_user, require_admin, require_user
from lib.db import db
from lib.dates import aware
from lib.queries import decorate_publications
from models.content import PublicationOut
from models.social import (
    AdminOverview,
    AdminUserOut,
    CategoryCreate,
    CategoryOut,
    MessageOut,
    ReportCreate,
    ReportOut,
)

router = APIRouter(tags=["moderation"])


def _slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-")
    return slug or f"cat-{uuid.uuid4().hex[:6]}"


# ---------- reports (any authenticated user) ----------

@router.post("/reports", response_model=MessageOut, status_code=201)
async def create_report(input: ReportCreate, user: dict = Depends(require_user)):
    await db.reports.insert_one(
        {
            "id": str(uuid.uuid4()),
            "reporter_id": user["id"],
            "reporter_name": user.get("name", ""),
            "target_id": input.target_id,
            "target_type": input.target_type,
            "reason": input.reason,
            "details": input.details,
            "status": "open",
            "created_at": datetime.now(timezone.utc),
        }
    )
    return MessageOut(message="Denúncia enviada. Nossa equipe irá analisar.")


# ---------- admin panel ----------

@router.get("/admin/overview", response_model=AdminOverview)
async def admin_overview(_admin: dict = Depends(require_admin)):
    return AdminOverview(
        users_count=await db.users.count_documents({}),
        publications_count=await db.publications.count_documents({}),
        comments_count=await db.comments.count_documents({}),
        debates_count=await db.publications.count_documents({"type": "debate"}),
        open_reports=await db.reports.count_documents({"status": "open"}),
        total_views=sum(
            [d.get("views", 0) for d in await db.publications.find({}, {"views": 1}).to_list(2000)]
        ),
    )


@router.get("/admin/users", response_model=list[AdminUserOut])
async def admin_users(_admin: dict = Depends(require_admin)):
    docs = await db.users.find().sort("created_at", -1).to_list(500)
    out = []
    for u in docs:
        out.append(
            AdminUserOut(
                id=u.get("id", ""),
                name=u.get("name", ""),
                email=u.get("email", ""),
                role=u.get("role", "user"),
                avatar_url=u.get("avatar_url", ""),
                institution=u.get("institution", ""),
                suspended=u.get("suspended", False),
                publications_count=await db.publications.count_documents({"author_id": u.get("id", "")}),
                created_at=aware(u.get("created_at")),
            )
        )
    return out


@router.post("/admin/users/{user_id}/suspend", response_model=MessageOut)
async def suspend_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Você não pode suspender a si mesmo.")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Não é possível suspender outro administrador.")
    new_value = not target.get("suspended", False)
    await db.users.update_one({"id": user_id}, {"$set": {"suspended": new_value}})
    return MessageOut(message=f"Usuário {'suspenso' if new_value else 'reativado'}.")


@router.get("/admin/reports", response_model=list[ReportOut])
async def admin_reports(_admin: dict = Depends(require_admin)):
    docs = await db.reports.find().sort("created_at", -1).to_list(200)
    out = []
    for d in docs:
        target_title = ""
        if d.get("target_type") == "publication":
            pub = await db.publications.find_one({"id": d["target_id"]}, {"title": 1})
            target_title = (pub or {}).get("title", "")
        elif d.get("target_type") == "comment":
            c = await db.comments.find_one({"id": d["target_id"]}, {"text": 1})
            target_title = ((c or {}).get("text", "") or "")[:80]
        else:
            u = await db.users.find_one({"id": d["target_id"]}, {"name": 1})
            target_title = (u or {}).get("name", "")
        out.append(
            ReportOut(
                id=d["id"],
                reporter_id=d.get("reporter_id", ""),
                reporter_name=d.get("reporter_name", ""),
                target_id=d.get("target_id", ""),
                target_type=d.get("target_type", ""),
                reason=d.get("reason", ""),
                details=d.get("details", ""),
                status=d.get("status", "open"),
                target_title=target_title,
                created_at=aware(d.get("created_at")),
            )
        )
    return out


@router.post("/admin/reports/{report_id}/resolve", response_model=MessageOut)
async def resolve_report(report_id: str, _admin: dict = Depends(require_admin)):
    await db.reports.update_one({"id": report_id}, {"$set": {"status": "resolved"}})
    return MessageOut(message="Denúncia resolvida.")


@router.get("/admin/publications", response_model=list[PublicationOut])
async def admin_publications(_admin: dict = Depends(require_admin)):
    docs = await db.publications.find().sort("created_at", -1).to_list(100)
    return await decorate_publications(docs, None)


# ---------- categories (public read, admin write) ----------

@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(_viewer: dict | None = Depends(get_current_user)):
    docs = await db.categories.find().sort("name", 1).to_list(100)
    out = []
    for d in docs:
        out.append(
            CategoryOut(
                id=d["id"],
                name=d.get("name", ""),
                slug=d.get("slug", ""),
                publications_count=await db.publications.count_documents(
                    {"category": d.get("name", ""), "status": "published"}
                ),
            )
        )
    return out


@router.post("/categories", response_model=CategoryOut, status_code=201)
async def create_category(input: CategoryCreate, _admin: dict = Depends(require_admin)):
    slug = _slug(input.name)
    if await db.categories.find_one({"slug": slug}):
        raise HTTPException(status_code=409, detail="Já existe uma categoria com este nome.")
    doc = {
        "id": str(uuid.uuid4()),
        "name": input.name.strip(),
        "slug": slug,
        "created_at": datetime.now(timezone.utc),
    }
    await db.categories.insert_one(doc)
    return CategoryOut(id=doc["id"], name=doc["name"], slug=slug, publications_count=0)


@router.delete("/categories/{category_id}", response_model=MessageOut)
async def delete_category(category_id: str, _admin: dict = Depends(require_admin)):
    result = await db.categories.delete_one({"id": category_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    return MessageOut(message="Categoria removida.")
