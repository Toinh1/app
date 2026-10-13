"""Comments, notifications, reports, categories, search and admin models."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from models.content import PublicationOut
from models.users import ProfileMini


class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    parent_id: str | None = None


class CommentOut(BaseModel):
    id: str
    publication_id: str
    parent_id: str | None = None
    author_id: str
    author_name: str = ""
    author_avatar: str = ""
    text: str
    likes_count: int = 0
    created_at: datetime | None = None
    liked_by_me: bool = False


class NotificationOut(BaseModel):
    id: str
    type: str
    actor_id: str = ""
    actor_name: str = ""
    actor_avatar: str = ""
    publication_id: str | None = None
    publication_type: str = ""
    publication_title: str = ""
    text: str = ""
    read: bool = False
    created_at: datetime | None = None


class NotificationList(BaseModel):
    items: list[NotificationOut] = []
    unread: int = 0


class ReportCreate(BaseModel):
    target_id: str
    target_type: Literal["publication", "comment", "user"]
    reason: str = Field(min_length=1, max_length=80)
    details: str = Field(default="", max_length=1000)


class ReportOut(BaseModel):
    id: str
    reporter_id: str = ""
    reporter_name: str = ""
    target_id: str
    target_type: str
    reason: str
    details: str = ""
    status: str = "open"
    target_title: str = ""
    created_at: datetime | None = None


class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str = ""
    publications_count: int = 0


class ToggleLikeOut(BaseModel):
    liked: bool
    likes_count: int


class ToggleSaveOut(BaseModel):
    saved: bool


class ToggleFollowOut(BaseModel):
    following: bool
    followers_count: int = 0


class ViewOut(BaseModel):
    views: int


class UploadOut(BaseModel):
    url: str
    filename: str
    size: int
    content_type: str


class MessageOut(BaseModel):
    message: str


class SearchResults(BaseModel):
    publications: list[PublicationOut] = []
    creators: list[ProfileMini] = []
    categories: list[CategoryOut] = []


class ExplorePayload(BaseModel):
    featured: list[PublicationOut] = []
    trending: list[PublicationOut] = []
    recent: list[PublicationOut] = []
    creators: list[ProfileMini] = []
    categories: list[CategoryOut] = []


class AdminOverview(BaseModel):
    users_count: int = 0
    publications_count: int = 0
    comments_count: int = 0
    debates_count: int = 0
    open_reports: int = 0
    total_views: int = 0


class AdminUserOut(BaseModel):
    id: str
    name: str
    email: str = ""
    role: str = "user"
    avatar_url: str = ""
    institution: str = ""
    suspended: bool = False
    publications_count: int = 0
    created_at: datetime | None = None


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
