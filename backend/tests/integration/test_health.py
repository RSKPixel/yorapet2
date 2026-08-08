"""Health endpoint tests."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_liveness(client: TestClient) -> None:
    response = client.get("/api/v1/health/live")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "service" in payload
    assert "version" in payload
    assert response.headers.get("X-Request-ID")


def test_readiness_returns_structured_payload(client: TestClient) -> None:
    response = client.get("/api/v1/health/ready")
    assert response.status_code in {200, 503}
    payload = response.json()
    assert payload["status"] in {"ready", "not_ready"}
    assert payload["database"] in {"up", "down"}
    assert "service" in payload
