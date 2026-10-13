"""Publication, program and playlist models.

`publications` is the unified content collection: videocasts, podcast episodes,
relatos and debates all live here with a `type` discriminator.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ContentTypes = Literal["videocast", "podcast", "relato", "debate"]
MediaKinds = Literal["video", "audio", "text", "image"]
StatusTypes = Literal["published", "draft"]


class PublicationCreate(BaseModel):
    type: ContentTypes
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=4000)
    category: str = Field(default="", max_length=80)
    tags: list[str] = Field(default_factory=list, max_length=12)
    media_url: str = Field(default="", max_length=600)
    media_kind: MediaKinds = "text"
    thumbnail_url: str = Field(default="", max_length=600)
    cover_url: str = Field(default="", max_length=600)
    duration_sec: float = 0
    status: StatusTypes = "published"
    program_id: str | None = None


class PublicationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    category: str | None = Field(default=None, max_length=80)
    tags: list[str] | None = None
    thumbnail_url: str | None = Field(default=None, max_length=600)
    cover_url: str | None = Field(default=None, max_length=600)
    status: StatusTypes | None = None
    resolved: bool | None = None


class PublicationOut(BaseModel):
    id: str
    type: ContentTypes
    title: str
    description: str = ""
    category: str = ""
    tags: list[str] = []
    author_id: str
    author_name: str = ""
    author_avatar: str = ""
    media_url: str = ""
    media_kind: MediaKinds = "text"
    thumbnail_url: str = ""
    cover_url: str = ""
    duration_sec: float = 0
    views: int = 0
    likes_count: int = 0
    comments_count: int = 0
    status: StatusTypes = "published"
    program_id: str | None = None
    program_title: str = ""
    episode_number: int | None = None
    resolved: bool = False
    is_demo: bool = False
    created_at: datetime | None = None
    liked_by_me: bool = False
    saved_by_me: bool = False


class PublicationList(BaseModel):
    items: list[PublicationOut] = []
    total: int = 0
    has_more: bool = False


class ProgramCreate(BaseModel):
    title: str = Field(min_length=1, max_length=140)
    description: str = Field(default="", max_length=2000)
    cover_url: str = Field(default="", max_length=600)


class ProgramOut(BaseModel):
    id: str
    title: str
    description: str = ""
    cover_url: str = ""
    host_id: str = ""
    host_name: str = ""
    host_avatar: str = ""
    episodes_count: int = 0
    followers_count: int = 0
    is_following: bool = False
    created_at: datetime | None = None


class ProgramDetail(ProgramOut):
    episodes: list[PublicationOut] = []


class PlaylistCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    is_public: bool = True


class PlaylistItemAdd(BaseModel):
    publication_id: str


class PlaylistOut(BaseModel):
    id: str
    title: str
    is_public: bool = True
    owner_id: str
    owner_name: str = ""
    items: list[PublicationOut] = []
    created_at: datetime | None = None


class HistoryProgress(BaseModel):
    publication_id: str
    position_sec: float = 0


class HistoryEntry(BaseModel):
    publication: PublicationOut
    position_sec: float = 0
    updated_at: datetime | None = None


class LibraryPayload(BaseModel):
    saved: list[PublicationOut] = []
    liked: list[PublicationOut] = []
    playlists: list[PlaylistOut] = []
    history: list[HistoryEntry] = []
