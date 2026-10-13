"""Criterion: Busca global e filtros de descoberta."""
import uuid

import httpx


def test_search_returns_results_for_known_term(client: httpx.Client):
    r = client.get("/search", params={"q": "lideranca"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "publications" in body and "creators" in body and "categories" in body


def test_search_type_filter_restricts_results(client: httpx.Client):
    c = httpx.Client(base_url=client.base_url, timeout=30.0)
    try:
        email = f"tscheck-search-{uuid.uuid4().hex[:8]}@example.com"
        r = c.post(
            "/auth/register",
            json={"name": "TSCheck Busca", "email": email, "password": "Senha@2025", "institution": "UFX", "area": "ADM"},
        )
        assert r.status_code == 201, r.text
        unique = f"tscheckbuscaunica{uuid.uuid4().hex[:8]}"
        r_pub = c.post(
            "/publications",
            json={"type": "debate", "title": unique, "description": "Tese de busca.", "category": "Lideranca"},
        )
        assert r_pub.status_code == 201, r_pub.text
        pub_id = r_pub.json()["id"]

        r_search_match = c.get("/search", params={"q": unique, "type": "debate"})
        assert r_search_match.status_code == 200
        assert pub_id in [p["id"] for p in r_search_match.json()["publications"]]

        r_search_mismatch = c.get("/search", params={"q": unique, "type": "videocast"})
        assert r_search_mismatch.status_code == 200
        assert pub_id not in [p["id"] for p in r_search_mismatch.json()["publications"]]
    finally:
        c.close()


def test_search_unknown_term_returns_empty_not_error(client: httpx.Client):
    r = client.get("/search", params={"q": f"tscheck-nao-existe-{uuid.uuid4().hex[:10]}"})
    assert r.status_code == 200, r.text
    assert r.json()["publications"] == []
    assert r.json()["creators"] == []


def test_explore_payload_structure(client: httpx.Client):
    r = client.get("/explore")
    assert r.status_code == 200, r.text
    body = r.json()
    for key in ("featured", "trending", "recent"):
        assert key in body
