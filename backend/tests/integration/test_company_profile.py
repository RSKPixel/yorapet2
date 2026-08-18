"""Integration tests for company profile endpoints."""

from __future__ import annotations

from app.core.config import get_settings
from fastapi.testclient import TestClient


def _login(client: TestClient, username: str, password: str) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200


def test_company_profile_allows_authenticated_read(client: TestClient) -> None:
    settings = get_settings()
    assert settings.admin_username is not None
    assert settings.admin_password is not None

    _login(client, settings.admin_username, settings.admin_password)

    response = client.get("/api/v1/company-profile")

    assert response.status_code == 200
    assert response.json()["company_name"] == ""
    assert response.json()["gstin"] == ""


def test_company_profile_allows_admin_update(client: TestClient) -> None:
    settings = get_settings()
    assert settings.admin_username is not None
    assert settings.admin_password is not None

    _login(client, settings.admin_username, settings.admin_password)

    response = client.patch(
        "/api/v1/company-profile",
        json={
            "company_name": "Yora Pet",
            "address": "12 Market Road",
            "area": "West Mambalam",
            "city": "Chennai",
            "pin": "600033",
            "email": "office@example.com",
            "phone": "9876543210",
            "gstin": "33ABCDE1234F1Z5",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["company_name"] == "Yora Pet"
    assert body["area"] == "West Mambalam"
    assert body["gstin"] == "33ABCDE1234F1Z5"


def test_company_profile_rejects_non_admin_update(client: TestClient) -> None:
    settings = get_settings()
    assert settings.admin_username is not None
    assert settings.admin_password is not None

    _login(client, settings.admin_username, settings.admin_password)

    create_user_response = client.post(
        "/api/v1/users",
        json={
            "username": "viewer",
            "display_name": "Viewer",
            "password": "viewer-pass-1",
            "role": "user",
            "is_active": True,
        },
    )
    assert create_user_response.status_code == 201

    client.post("/api/v1/auth/logout")
    _login(client, "viewer", "viewer-pass-1")

    response = client.patch(
        "/api/v1/company-profile",
        json={
            "company_name": "Blocked Update",
            "address": "12 Market Road",
            "area": "West Mambalam",
            "city": "Chennai",
            "pin": "600033",
            "email": "office@example.com",
            "phone": "9876543210",
            "gstin": "33ABCDE1234F1Z5",
        },
    )

    assert response.status_code == 403
