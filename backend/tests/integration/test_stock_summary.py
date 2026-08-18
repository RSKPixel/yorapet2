"""Integration tests for stock summary endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_stock_summary_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/stock-summary")
    assert response.status_code == 401


def test_stock_summary_activity_requires_authentication(client: TestClient) -> None:
    response = client.get(
        "/api/v1/stock-summary/activity",
        params={"stock_item": "1000ML Cherry Bottle Mix"},
    )
    assert response.status_code == 401


def test_stock_pnl_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/stock-summary/pnl")
    assert response.status_code == 401
