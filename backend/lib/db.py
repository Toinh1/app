"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "users": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("email", ASCENDING)], name="email", unique=True),
    ],
    "publications": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("status", ASCENDING), ("type", ASCENDING), ("created_at", DESCENDING)], name="status_type_created"),
        IndexModel([("author_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)], name="author_status_created"),
        IndexModel([("program_id", ASCENDING), ("episode_number", ASCENDING)], name="program_episode"),
        IndexModel([("category", ASCENDING), ("created_at", DESCENDING)], name="category_created"),
    ],
    "comments": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("publication_id", ASCENDING), ("created_at", ASCENDING)], name="pub_created"),
        IndexModel([("parent_id", ASCENDING)], name="parent"),
    ],
    "likes": [
        IndexModel([("user_id", ASCENDING), ("target_id", ASCENDING), ("target_type", ASCENDING)], name="user_target", unique=True),
        IndexModel([("target_id", ASCENDING)], name="target"),
    ],
    "follows": [
        IndexModel([("follower_id", ASCENDING), ("target_id", ASCENDING), ("target_type", ASCENDING)], name="follower_target", unique=True),
        IndexModel([("target_id", ASCENDING), ("target_type", ASCENDING)], name="target"),
    ],
    "saved": [
        IndexModel([("user_id", ASCENDING), ("publication_id", ASCENDING)], name="user_pub", unique=True),
        IndexModel([("publication_id", ASCENDING)], name="pub"),
    ],
    "playlists": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("owner_id", ASCENDING), ("created_at", DESCENDING)], name="owner_created"),
    ],
    "history": [
        IndexModel([("user_id", ASCENDING), ("publication_id", ASCENDING)], name="user_pub", unique=True),
        IndexModel([("user_id", ASCENDING), ("updated_at", DESCENDING)], name="user_updated"),
    ],
    "notifications": [
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_created"),
    ],
    "reports": [
        IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
    ],
    "categories": [
        IndexModel([("slug", ASCENDING)], name="slug", unique=True),
    ],
    "programs": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("host_id", ASCENDING)], name="host"),
    ],
    "password_resets": [
        IndexModel([("token", ASCENDING)], name="token"),
        IndexModel([("expires_at", ASCENDING)], name="expires"),
    ],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
