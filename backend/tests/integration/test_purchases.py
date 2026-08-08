"""Integration tests for purchases report endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_list_purchases_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/purchases")
    assert response.status_code == 401
