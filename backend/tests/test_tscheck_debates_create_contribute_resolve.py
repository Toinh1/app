"""Criterion: Debates: criar, contribuir e encerrar."""
import uuid

import httpx


def _login_new_user(base_url) -> httpx.Client:
    email = f"tscheck-debate-{uuid.uuid4().hex[:8]}@example.com"
    c = httpx.Client(base_url=base_url, timeout=30.0)
    r = c.post(
        "/auth/register",
        json={"name": "TSCheck Debate", "email": email, "password": "Senha@2025", "institution": "UFX", "area": "ADM"},
    )
    assert r.status_code == 201, r.text
    return c


def test_create_debate_comment_like_and_resolve(client: httpx.Client):
    author = _login_new_user(client.base_url)
    other = _login_new_user(client.base_url)
    try:
        title = f"tscheck-debate-{uuid.uuid4().hex[:8]}"
        r = author.post(
            "/publications",
            json={"type": "debate", "title": title, "description": "Tese de teste.", "category": "Estrategia Empresarial"},
        )
        assert r.status_code == 201, r.text
        pub_id = r.json()["id"]
        assert r.json()["resolved"] is False

        # appears in the public debates list
        r_list = other.get("/publications", params={"type": "debate", "limit": 48})
        assert pub_id in [p["id"] for p in r_list.json()["items"]]

        # another user comments and likes
        r_comment = other.post(f"/publications/{pub_id}/comments", json={"text": "Contribuicao de teste."})
        assert r_comment.status_code == 201, r_comment.text

        r_like = other.post(f"/publications/{pub_id}/like")
        assert r_like.status_code == 200
        assert r_like.json()["liked"] is True

        # non-author cannot mark as resolved
        r_forbidden = other.patch(f"/publications/{pub_id}", json={"resolved": True})
        assert r_forbidden.status_code in (403, 401), r_forbidden.text

        # author resolves the debate
        r_resolve = author.patch(f"/publications/{pub_id}", json={"resolved": True})
        assert r_resolve.status_code == 200, r_resolve.text
        assert r_resolve.json()["resolved"] is True
    finally:
        author.close()
        other.close()
