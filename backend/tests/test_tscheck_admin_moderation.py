"""Criterion: Painel admin protegido por papel e com moderacao operante."""
import uuid

import httpx


def _login(base_url, email, password) -> httpx.Client:
    c = httpx.Client(base_url=base_url, timeout=30.0)
    r = c.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return c


def test_student_denied_admin_data(client: httpx.Client):
    student = _login(client.base_url, "ana@demo.com", "Demo@2025")
    try:
        r = student.get("/admin/overview")
        assert r.status_code == 403, r.text
        r_users = student.get("/admin/users")
        assert r_users.status_code == 403, r_users.text
    finally:
        student.close()


def test_admin_overview_metrics_and_category_crud(client: httpx.Client):
    admin = _login(client.base_url, "admin@administrase.com", "Admin@2025")
    try:
        r = admin.get("/admin/overview")
        assert r.status_code == 200, r.text
        body = r.json()
        for key in ("users_count", "publications_count", "comments_count", "debates_count", "open_reports", "total_views"):
            assert key in body

        r_users = admin.get("/admin/users")
        assert r_users.status_code == 200
        assert len(r_users.json()) >= 1

        cat_name = f"tscheck-cat-{uuid.uuid4().hex[:8]}"
        r_create = admin.post("/categories", json={"name": cat_name})
        assert r_create.status_code == 201, r_create.text
        cat_id = r_create.json()["id"]

        r_list = admin.get("/categories")
        assert cat_name in [c["name"] for c in r_list.json()]

        r_delete = admin.delete(f"/categories/{cat_id}")
        assert r_delete.status_code == 200, r_delete.text

        r_list2 = admin.get("/categories")
        assert cat_id not in [c["id"] for c in r_list2.json()]
    finally:
        admin.close()


def test_report_flow_visible_and_resolvable_by_admin(client: httpx.Client):
    student = _login(client.base_url, "ana@demo.com", "Demo@2025")
    admin = _login(client.base_url, "admin@administrase.com", "Admin@2025")
    try:
        target_id = f"tscheck-report-target-{uuid.uuid4().hex[:8]}"
        r_report = student.post(
            "/reports",
            json={"target_id": target_id, "target_type": "user", "reason": "spam", "details": "tscheck denuncia de teste"},
        )
        assert r_report.status_code == 201, r_report.text

        r_admin_reports = admin.get("/admin/reports")
        assert r_admin_reports.status_code == 200
        matches = [rep for rep in r_admin_reports.json() if rep["target_id"] == target_id]
        assert len(matches) == 1
        assert matches[0]["status"] == "open"
        report_id = matches[0]["id"]

        r_resolve = admin.post(f"/admin/reports/{report_id}/resolve")
        assert r_resolve.status_code == 200, r_resolve.text

        r_admin_reports2 = admin.get("/admin/reports")
        matches2 = [rep for rep in r_admin_reports2.json() if rep["id"] == report_id]
        assert matches2[0]["status"] == "resolved"
    finally:
        student.close()
        admin.close()
