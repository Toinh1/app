"""Authentication routes: register, login, logout, me, password recovery."""
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response

from lib.auth import (
    clear_session_cookie,
    create_session_token,
    get_current_user,
    hash_password,
    set_session_cookie,
    verify_password,
)
from lib.db import db
from lib.dates import aware
from models.social import MessageOut
from models.users import (
    ForgotPasswordRequest,
    PasswordResetRequest,
    UserCreate,
    UserLogin,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])

RESET_TTL_MINUTES = 30


def user_out(doc: dict) -> UserOut:
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


@router.post("/register", response_model=UserOut, status_code=201)
async def register(input: UserCreate, response: Response):
    email = input.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Já existe uma conta com este e-mail.")
    doc = {
        "id": str(uuid.uuid4()),
        "name": input.name.strip(),
        "email": email,
        "password_hash": hash_password(input.password),
        "role": "user",
        "bio": "",
        "institution": input.institution.strip(),
        "area": input.area.strip(),
        "semester": "",
        "avatar_url": "",
        "linkedin": "",
        "suspended": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(doc)
    set_session_cookie(response, create_session_token(doc["id"]))
    return user_out(doc)


@router.post("/login", response_model=UserOut)
async def login(input: UserLogin, response: Response):
    doc = await db.users.find_one({"email": input.email.lower().strip()})
    if not doc or not verify_password(input.password, doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    if doc.get("suspended"):
        raise HTTPException(status_code=403, detail="Esta conta foi suspensa. Fale com a administração.")
    set_session_cookie(response, create_session_token(doc["id"]))
    return user_out(doc)


@router.post("/logout", response_model=MessageOut)
async def logout(response: Response):
    clear_session_cookie(response)
    return MessageOut(message="Sessão encerrada.")


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado.")
    return user_out(user)


@router.post("/forgot-password", response_model=MessageOut)
async def forgot_password(input: ForgotPasswordRequest):
    """Creates a reset token. Without an e-mail provider configured (this version), the
    token is returned in the response and shown in the interface — documented as a demo flow."""
    email = input.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        # do not leak which e-mails exist
        return MessageOut(message="Se o e-mail estiver cadastrado, um token de redefinição será gerado.")
    token = secrets.token_urlsafe(32)
    await db.password_resets.insert_one(
        {
            "id": str(uuid.uuid4()),
            "email": email,
            "token": token,
            "used": False,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=RESET_TTL_MINUTES),
            "created_at": datetime.now(timezone.utc),
        }
    )
    return MessageOut(message=f"Token de redefinição (válido por {RESET_TTL_MINUTES} min): {token}")


@router.post("/reset-password", response_model=MessageOut)
async def reset_password(input: PasswordResetRequest):
    doc = await db.password_resets.find_one({"token": input.token.strip(), "used": False})
    if not doc:
        raise HTTPException(status_code=400, detail="Token inválido ou já utilizado.")
    if doc["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expirado. Solicite um novo.")
    await db.users.update_one(
        {"email": doc["email"]}, {"$set": {"password_hash": hash_password(input.new_password)}}
    )
    await db.password_resets.update_one({"id": doc["id"]}, {"$set": {"used": True}})
    return MessageOut(message="Senha redefinida com sucesso. Faça login com a nova senha.")
