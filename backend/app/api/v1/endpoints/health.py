"""Health and readiness endpoints."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.dependencies import SettingsDep
from app.schemas.health import HealthResponse, ReadinessResponse

router = APIRouter(tags=["health"])


@router.get(
    "/health/live",
    response_model=HealthResponse,
    summary="Liveness probe",
)
async def live(settings: SettingsDep) -> HealthResponse:
    """Return process liveness without checking dependencies."""
    return HealthResponse(
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
    )


@router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    summary="Readiness probe",
    responses={
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ReadinessResponse},
    },
)
async def ready(request: Request, settings: SettingsDep) -> JSONResponse:
    """Return readiness after verifying database connectivity."""
    database_status: Literal["up", "down"] = "down"
    detail: str | None = None

    try:
        engine = request.app.state.engine
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        database_status = "up"
    except Exception:
        detail = "database_unreachable"

    payload = ReadinessResponse(
        status="ready" if database_status == "up" else "not_ready",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        database=database_status,
        detail=detail,
    )
    status_code = (
        status.HTTP_200_OK
        if payload.status == "ready"
        else status.HTTP_503_SERVICE_UNAVAILABLE
    )
    return JSONResponse(status_code=status_code, content=payload.model_dump())
