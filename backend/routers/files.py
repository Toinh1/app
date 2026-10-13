"""Media uploads (audio/video/image) and file serving.

Files live on the pod's local disk under backend/uploads/ and are served through
/api/files/<name> so the Vite proxy (and the single-origin production build) reach them.
"""
import mimetypes
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse

from lib.auth import require_user
from models.social import UploadOut

router = APIRouter(tags=["files"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_BYTES = 60 * 1024 * 1024  # 60 MB
ALLOWED_PREFIXES = ("audio/", "video/", "image/")


def _extension_for(content_type: str) -> str:
    guessed = mimetypes.guess_extension(content_type)
    if guessed:
        return guessed.lstrip(".")
    return "bin"


@router.post("/uploads", response_model=UploadOut, status_code=201)
async def upload_file(file: UploadFile, _user: dict = Depends(require_user)):
    content_type = file.content_type or ""
    if not content_type.startswith(ALLOWED_PREFIXES):
        raise HTTPException(
            status_code=400,
            detail="Formato não suportado. Envie arquivos de áudio, vídeo ou imagem.",
        )
    extension = _extension_for(content_type)
    name = f"{uuid.uuid4().hex}.{extension}"
    path = UPLOAD_DIR / name
    total = 0
    with path.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            total += len(chunk)
            if total > MAX_BYTES:
                out.close()
                path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Arquivo maior que 60 MB.")
            out.write(chunk)
    if total == 0:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Arquivo vazio.")
    return UploadOut(url=f"/api/files/{name}", filename=name, size=total, content_type=content_type)


@router.get("/files/{name}")
async def serve_file(name: str):
    if "/" in name or ".." in name or "\\" in name:
        raise HTTPException(status_code=400, detail="Nome de arquivo inválido.")
    path = UPLOAD_DIR / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    media_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
    return FileResponse(path, media_type=media_type)
