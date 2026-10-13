"""Criterion: Cadastro e login reais com sessao persistente e protecao de rotas privadas."""
import uuid

import httpx


def test_register_login_and_me(client: httpx.Client):
    email = f"tscheck-auth-{uuid.uuid4().hex[:8]}@example.com"
    r = client.post(
        "/auth/register",
        json={"name": "TSCheck Autor", "email": email, "password": "Senha@2025", "institution": "UFX", "area": "ADM"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["email"] == email

    # new client without cookies is not authenticated
    with httpx.Client(base_url=client.base_url, timeout=30.0) as anon:
        r_me_anon = anon.get("/auth/me")
        assert r_me_anon.status_code == 401

    r_me = client.get("/auth/me")
    assert r_me.status_code == 200
    assert r_me.json()["email"] == email


def test_login_wrong_password_rejected(client: httpx.Client):
    r = client.post("/auth/login", json={"email": "ana@demo.com", "password": "senha-errada"})
    assert r.status_code == 401, r.text


def test_login_correct_credentials(client: httpx.Client):
    r = client.post("/auth/login", json={"email": "ana@demo.com", "password": "Demo@2025"})
    assert r.status_code == 200, r.text
    assert r.json()["email"] == "ana@demo.com"


def test_private_endpoints_require_auth(client: httpx.Client):
    # library is a private route surface mirrored by /biblioteca
    r = client.get("/library")
    assert r.status_code == 401
