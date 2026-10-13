"""Shared serialization/query helpers for publications."""
from datetime import datetime, timezone

from lib.db import db
from lib.dates import aware
from models.content import PublicationList, PublicationOut


def pub_from_doc(doc: dict) -> PublicationOut:
    """Build a PublicationOut from a raw mongo doc (drops _id, normalizes datetimes)."""
    data = {k: v for k, v in doc.items() if k != "_id"}
    data["created_at"] = aware(data.get("created_at"))
    return PublicationOut(**data)


async def decorate_publications(docs: list[dict], user_id: str | None) -> list[PublicationOut]:
    """Attach per-user liked/saved flags in two batched queries."""
    ids = [d["id"] for d in docs if d.get("id")]
    liked: set[str] = set()
    saved: set[str] = set()
    if user_id and ids:
        like_docs = await db.likes.find(
            {"user_id": user_id, "target_type": "publication", "target_id": {"$in": ids}}
        ).to_list(len(ids))
        liked = {d["target_id"] for d in like_docs}
        saved_docs = await db.saved.find(
            {"user_id": user_id, "publication_id": {"$in": ids}}
        ).to_list(len(ids))
        saved = {d["publication_id"] for d in saved_docs}
    out: list[PublicationOut] = []
    for doc in docs:
        pub = pub_from_doc(doc)
        pub.liked_by_me = pub.id in liked
        pub.saved_by_me = pub.id in saved
        out.append(pub)
    return out


async def fetch_publication_page(
    query: dict,
    tab: str,
    page: int,
    limit: int,
    user_id: str | None,
) -> PublicationList:
    """List publications with tab-aware sorting (score blend for for_you/trending)."""
    skip = (page - 1) * limit
    total = await db.publications.count_documents(query)

    if tab in ("foryou", "trending"):
        weight = 5 if tab == "trending" else 1
        pipeline = [
            {"$match": query},
            {
                "$addFields": {
                    "_score": {
                        "$add": [
                            {"$divide": [{"$ifNull": ["$views", 0]}, 50.0]},
                            {"$multiply": [{"$ifNull": ["$likes_count", 0]}, 2 * weight]},
                            {"$multiply": [{"$ifNull": ["$comments_count", 0]}, 3 * weight]},
                        ]
                    }
                }
            },
            {"$sort": {"_score": -1, "created_at": -1}},
            {"$skip": skip},
            {"$limit": limit},
        ]
        docs = await db.publications.aggregate(pipeline).to_list(limit)
    else:
        docs = (
            await db.publications.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
            .to_list(limit)
        )

    items = await decorate_publications(docs, user_id)
    return PublicationList(items=items, total=total, has_more=skip + len(items) < total)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def score_pipeline_query(query: dict) -> list[dict]:
    """Aggregation stages sorting by popularity blend — used by explore/featured."""
    return [
        {"$match": query},
        {
            "$addFields": {
                "_score": {
                    "$add": [
                        {"$divide": [{"$ifNull": ["$views", 0]}, 25.0]},
                        {"$multiply": [{"$ifNull": ["$likes_count", 0]}, 3]},
                        {"$multiply": [{"$ifNull": ["$comments_count", 0]}, 5]},
                    ]
                }
            }
        },
        {"$sort": {"_score": -1, "created_at": -1}},
    ]
