"""Criterion: Publicacao de conteudo pelo estudio (relato em texto) e rascunhos."""
import uuid

import httpx


def _login_new_user(base_url) -> httpx.Client:
    email = f"tscheck-relato-{uuid.uuid4().hex[:8]}@example.com"
    c = httpx.Client(base_url=base_url, timeout=30.0)
    r = c.post(
        "/auth/register",
        json={"name": "TSCheck Relato", "email": email, "password": "Senha@2025", "institution": "UFX", "area": "ADM"},
    )
    assert r.status_code == 201, r.text
    return c


def test_publish_relato_appears_in_public_list(client: httpx.Client):
    c = _login_new_user(client.base_url)
    try:
        title = f"tscheck-relato-pub-{uuid.uuid4().hex[:8]}"
        r = c.post(
            "/publications",
            json={
                "type": "relato",
                "title": title,
                "description": "Texto do relato de teste.",
                "category": "Lideranca",
                "status": "published",
            },
        )
        assert r.status_code == 201, r.text
        pub_id = r.json()["id"]
        assert r.json()["status"] == "published"

        r_list = c.get("/publications", params={"type": "relato", "status": "published", "limit": 48})
        assert r_list.status_code == 200
        ids = [p["id"] for p in r_list.json()["items"]]
        assert pub_id in ids
    finally:
        c.close()


def test_save_draft_relato_hidden_from_public_list_visible_to_author(client: httpx.Client):
    c = _login_new_user(client.base_url)
    try:
        title = f"tscheck-relato-draft-{uuid.uuid4().hex[:8]}"
        r = c.post(
            "/publications",
            json={
                "type": "relato",
                "title": title,
                "description": "Rascunho de teste.",
                "category": "Lideranca",
                "status": "draft",
            },
        )
        assert r.status_code == 201, r.text
        pub_id = r.json()["id"]
        assert r.json()["status"] == "draft"
        author_id = r.json()["author_id"]

        r_public = c.get("/publications", params={"type": "relato", "status": "published", "limit": 48})
        assert pub_id not in [p["id"] for p in r_public.json()["items"]]

        r_own_drafts = c.get("/publications", params={"author_id": author_id, "status": "draft", "limit": 48})
        assert r_own_drafts.status_code == 200
        assert pub_id in [p["id"] for p in r_own_drafts.json()["items"]]

        # anonymous visitor listing this author's publications never sees the draft
        with httpx.Client(base_url=client.base_url, timeout=30.0) as anon:
            r_anon = anon.get("/publications", params={"author_id": author_id, "limit": 48})
            assert pub_id not in [p["id"] for p in r_anon.json()["items"]]
    finally:
        c.close()
