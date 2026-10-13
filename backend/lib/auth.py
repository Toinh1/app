"""Auth helpers: password hashing, JWT session cookies, FastAPI dependencies."""
import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, Response
from jose import JWTError, jwt
from passlib.context import CryptContext

from lib.db import db

AUTH_SECRET = os.environ.get("AUTH_SECRET", "administrase-cast-dev-secret-change-in-prod")
ALGORITHM = "HS256"
COOKIE_NAME = "asc_session"
SESSION_TTL_DAYS = 30

# pbkdf2 is passlib-built-in (no native bcrypt dependency noise)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(password, hashed)
    except Exception:
        return False


def create_session_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS),
    }
    return jwt.encode(payload, AUTH_SECRET, algorithm=ALGORITHM)


def read_session_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, AUTH_SECRET, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        samesite="lax",
        max_age=SESSION_TTL_DAYS * 24 * 3600,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


async def get_current_user(request: Request) -> dict | None:
    """Resolve the session cookie to the user document, or None. Suspended users are rejected."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    user_id = read_session_token(token)
    if not user_id:
        return None
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("suspended"):
        return None
    return user


async def require_user(user: dict | None = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Entre para usar este recurso.")
    return user


async def require_admin(user: dict = Depends(require_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    return user
