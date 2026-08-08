"""Integration tests for sales report endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import get_settings


def _login(client: TestClient, username: str, password: str) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200


def test_list_sales_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/sales")
    assert response.status_code == 401


def test_list_sales_returns_items_for_authenticated_user(
    client: TestClient,
) -> None:
    settings = get_settings()
    assert settings.admin_username is not None
    assert settings.admin_password is not None

    _login(client, settings.admin_username, settings.admin_password)

    response = client.get("/api/v1/sales")

    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert isinstance(body["items"], list)
