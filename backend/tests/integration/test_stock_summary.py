"""Integration tests for stock summary endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_stock_summary_requires_authentication(client: TestClient) -> None:
    response = client.get(
        "/api/v1/stock-summary",
        params={"as_on": "2026-07-28"},
    )
    assert response.status_code == 401
