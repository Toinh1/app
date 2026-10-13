"""Criterion: Pagina de videocast reproduz video e registra interacoes (comments/likes/save)."""
import uuid

import httpx


def _login_new_user(base_url) -> httpx.Client:
    email = f"tscheck-video-{uuid.uuid4().hex[:8]}@example.com"
    c = httpx.Client(base_url=base_url, timeout=30.0)
    r = c.post(
        "/auth/register",
        json={"name": "TSCheck Video", "email": email, "password": "Senha@2025", "institution": "UFX", "area": "ADM"},
    )
    assert r.status_code == 201, r.text
    return c


def _create_videocast(c: httpx.Client) -> str:
    title = f"tscheck-videocast-{uuid.uuid4().hex[:8]}"
    r = c.post(
        "/publications",
        json={
            "type": "videocast",
            "title": title,
            "description": "Video de teste.",
            "category": "Marketing",
            "media_url": "https://example.com/video.mp4",
            "media_kind": "video",
            "status": "published",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_like_persists_and_increments(client: httpx.Client):
    c = _login_new_user(client.base_url)
    try:
        pub_id = _create_videocast(c)
        r_like = c.post(f"/publications/{pub_id}/like")
        assert r_like.status_code == 200, r_like.text
        assert r_like.json()["liked"] is True
        assert r_like.json()["likes_count"] == 1

        r_get = c.get(f"/publications/{pub_id}")
        assert r_get.status_code == 200
        assert r_get.json()["likes_count"] == 1
        assert r_get.json()["liked_by_me"] is True
    finally:
        c.close()


def test_comment_and_nested_reply_persist(client: httpx.Client):
    author = _login_new_user(client.base_url)
    replier = _login_new_user(client.base_url)
    try:
        pub_id = _create_videocast(author)
        r_comment = author.post(f"/publications/{pub_id}/comments", json={"text": "tscheck comentario raiz"})
        assert r_comment.status_code == 201, r_comment.text
        comment_id = r_comment.json()["id"]

        r_reply = replier.post(
            f"/publications/{pub_id}/comments",
            json={"text": "tscheck resposta aninhada", "parent_id": comment_id},
        )
        assert r_reply.status_code == 201, r_reply.text
        assert r_reply.json()["parent_id"] == comment_id

        r_list = author.get(f"/publications/{pub_id}/comments")
        assert r_list.status_code == 200
        texts = {c["id"]: c for c in r_list.json()}
        assert comment_id in texts
        replies = [c for c in r_list.json() if c.get("parent_id") == comment_id]
        assert any(r["text"] == "tscheck resposta aninhada" for r in replies)
    finally:
        author.close()
        replier.close()


def test_save_adds_to_library_favorites(client: httpx.Client):
    c = _login_new_user(client.base_url)
    try:
        pub_id = _create_videocast(c)
        r_save = c.post(f"/publications/{pub_id}/save")
        assert r_save.status_code == 200, r_save.text
        assert r_save.json()["saved"] is True

        r_lib = c.get("/library")
        assert r_lib.status_code == 200
        saved_ids = [p["id"] for p in r_lib.json()["saved"]]
        assert pub_id in saved_ids
    finally:
        c.close()
