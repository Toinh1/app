"""User and auth Pydantic models."""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    institution: str = Field(default="", max_length=120)
    area: str = Field(default="", max_length=80)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class PasswordResetRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=72)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=72)


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    bio: str | None = Field(default=None, max_length=600)
    institution: str | None = Field(default=None, max_length=120)
    area: str | None = Field(default=None, max_length=80)
    semester: str | None = Field(default=None, max_length=30)
    linkedin: str | None = Field(default=None, max_length=200)
    avatar_url: str | None = Field(default=None, max_length=600)


class UserOut(BaseModel):
    """Self view — includes email (private)."""

    id: str
    name: str
    email: str = ""
    role: str = "user"
    bio: str = ""
    institution: str = ""
    area: str = ""
    semester: str = ""
    avatar_url: str = ""
    linkedin: str = ""
    created_at: datetime | None = None


class ProfileMini(BaseModel):
    id: str
    name: str
    avatar_url: str = ""
    institution: str = ""
    area: str = ""


class ProfileOut(BaseModel):
    """Public profile view — no email."""

    id: str
    name: str
    avatar_url: str = ""
    bio: str = ""
    institution: str = ""
    area: str = ""
    semester: str = ""
    linkedin: str = ""
    role: str = "user"
    created_at: datetime | None = None
    followers_count: int = 0
    following_count: int = 0
    publications_count: int = 0
    is_following: bool = False
    is_me: bool = False
