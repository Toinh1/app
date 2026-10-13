"""Criterion: Biblioteca: playlists e historico funcionais."""
import uuid

import httpx


def _login_new_user(base_url) -> httpx.Client:
    email = f"tscheck-lib-{uuid.uuid4().hex[:8]}@example.com"
    c = httpx.Client(base_url=base_url, timeout=30.0)
    r = c.post(
        "/auth/register",
        json={"name": "TSCheck Biblioteca", "email": email, "password": "Senha@2025", "institution": "UFX", "area": "ADM"},
    )
    assert r.status_code == 201, r.text
    return c


def test_create_playlist_add_item_and_delete(client: httpx.Client):
    c = _login_new_user(client.base_url)
    try:
        # fixture content to add into the playlist
        r_pub = c.post(
            "/publications",
            json={
                "type": "podcast",
                "title": f"tscheck-lib-ep-{uuid.uuid4().hex[:8]}",
                "description": "Episodio de teste.",
                "category": "Carreira e Estagio",
                "media_url": "https://example.com/audio.mp3",
                "media_kind": "audio",
                "status": "published",
            },
        )
        assert r_pub.status_code == 201, r_pub.text
        pub_id = r_pub.json()["id"]

        title = f"tscheck-playlist-{uuid.uuid4().hex[:8]}"
        r_pl = c.post("/playlists", json={"title": title, "is_public": True})
        assert r_pl.status_code == 201, r_pl.text
        playlist_id = r_pl.json()["id"]
        assert r_pl.json()["items"] == []

        r_add = c.post(f"/playlists/{playlist_id}/items", json={"publication_id": pub_id})
        assert r_add.status_code == 200, r_add.text
        assert pub_id in [i["id"] for i in r_add.json()["items"]]

        r_lib = c.get("/library")
        assert r_lib.status_code == 200
        pls = [p for p in r_lib.json()["playlists"] if p["id"] == playlist_id]
        assert len(pls) == 1
        assert pub_id in [i["id"] for i in pls[0]["items"]]

        r_del = c.delete(f"/playlists/{playlist_id}")
        assert r_del.status_code == 200, r_del.text

        r_lib2 = c.get("/library")
        assert playlist_id not in [p["id"] for p in r_lib2.json()["playlists"]]
    finally:
        c.close()


def test_history_records_playback_position(client: httpx.Client):
    c = _login_new_user(client.base_url)
    try:
        r_pub = c.post(
            "/publications",
            json={
                "type": "podcast",
                "title": f"tscheck-lib-hist-{uuid.uuid4().hex[:8]}",
                "description": "Episodio historico.",
                "category": "Carreira e Estagio",
                "media_url": "https://example.com/audio.mp3",
                "media_kind": "audio",
                "status": "published",
            },
        )
        assert r_pub.status_code == 201, r_pub.text
        pub_id = r_pub.json()["id"]

        r_hist = c.post("/history", params={"publication_id": pub_id, "position_sec": 42})
        assert r_hist.status_code == 200, r_hist.text

        r_lib = c.get("/library")
        assert r_lib.status_code == 200
        entries = [h for h in r_lib.json()["history"] if h["publication"]["id"] == pub_id]
        assert len(entries) == 1
        assert entries[0]["position_sec"] == 42
    finally:
        c.close()
