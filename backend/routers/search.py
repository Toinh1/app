"""Global search and the Explore page payload."""
import re

from fastapi import APIRouter, Depends, Query

from lib.auth import get_current_user
from lib.db import db
from lib.queries import decorate_publications, score_pipeline_query
from models.social import CategoryOut, ExplorePayload, SearchResults
from models.users import ProfileMini

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResults)
async def search(
    q: str = Query(""),
    type: str | None = Query(None),
    user: dict | None = Depends(get_current_user),
):
    term = q.strip()
    if not term:
        return SearchResults()
    rx = re.compile(re.escape(term), re.IGNORECASE)
    user_id = user["id"] if user else None

    pub_query: dict = {"status": "published", "$or": [{"title": rx}, {"description": rx}, {"tags": rx}, {"author_name": rx}]}
    if type:
        pub_query["type"] = type
    pub_docs = await db.publications.find(pub_query).sort("views", -1).to_list(12)
    publications = await decorate_publications(pub_docs, user_id)

    user_docs = await db.users.find(
        {"$or": [{"name": rx}, {"institution": rx}, {"area": rx}]}
    ).to_list(6)
    creators = [
        ProfileMini(
            id=u["id"],
            name=u.get("name", ""),
            avatar_url=u.get("avatar_url", ""),
            institution=u.get("institution", ""),
            area=u.get("area", ""),
        )
        for u in user_docs
    ]

    cat_docs = await db.categories.find({"name": rx}).to_list(6)
    categories = [CategoryOut(id=c["id"], name=c.get("name", ""), slug=c.get("slug", "")) for c in cat_docs]

    return SearchResults(publications=publications, creators=creators, categories=categories)


@router.get("/explore", response_model=ExplorePayload)
async def explore(user: dict | None = Depends(get_current_user)):
    user_id = user["id"] if user else None
    published = {"status": "published"}

    featured_docs = await db.publications.aggregate(
        score_pipeline_query(published) + [{"$limit": 4}]
    ).to_list(4)
    trending_docs = await db.publications.aggregate(
        score_pipeline_query(published) + [{"$skip": 4}, {"$limit": 8}]
    ).to_list(8)
    recent_docs = (
        await db.publications.find(published).sort("created_at", -1).limit(8).to_list(8)
    )

    followers_agg = await db.follows.aggregate(
        [
            {"$match": {"target_type": "user"}},
            {"$group": {"_id": "$target_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 6},
        ]
    ).to_list(6)
    creator_ids = [f["_id"] for f in followers_agg]
    creator_docs = (
        await db.users.find({"id": {"$in": creator_ids}}).to_list(len(creator_ids))
        if creator_ids
        else []
    )
    by_count = {f["_id"]: f["count"] for f in followers_agg}
    creator_docs.sort(key=lambda u: by_count.get(u.get("id", ""), 0), reverse=True)
    creators = [
        ProfileMini(
            id=u["id"],
            name=u.get("name", ""),
            avatar_url=u.get("avatar_url", ""),
            institution=u.get("institution", ""),
            area=u.get("area", ""),
        )
        for u in creator_docs
    ]

    cat_counts = await db.publications.aggregate(
        [
            {"$match": published},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        ]
    ).to_list(50)
    counts_by_name = {c["_id"]: c["count"] for c in cat_counts if c["_id"]}
    cat_docs = await db.categories.find().sort("name", 1).to_list(100)
    categories = [
        CategoryOut(
            id=c["id"],
            name=c.get("name", ""),
            slug=c.get("slug", ""),
            publications_count=counts_by_name.get(c.get("name", ""), 0),
        )
        for c in cat_docs
    ]

    return ExplorePayload(
        featured=await decorate_publications(featured_docs, user_id),
        trending=await decorate_publications(trending_docs, user_id),
        recent=await decorate_publications(recent_docs, user_id),
        creators=creators,
        categories=categories,
    )
