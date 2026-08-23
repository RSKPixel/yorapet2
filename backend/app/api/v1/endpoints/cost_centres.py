"""Cost centre API (Tally read-only)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.dependencies.auth import CurrentUserDep
from app.dependencies.database import DbSessionDep
from app.repositories.tally_cost_centre_repository import (
    BLOW_MACHINE_PARENT,
    TallyCostCentreRepository,
)
from app.schemas.cost_centre import CostCentreItemResponse, CostCentreListResponse

router = APIRouter(prefix="/cost-centres", tags=["cost-centres"])


@router.get("", response_model=CostCentreListResponse)
async def list_cost_centres(
    _user: CurrentUserDep,
    session: DbSessionDep,
    parent: str | None = Query(
        default=None,
        description=(
            "Filter by Tally cost centre parent. "
            f"Defaults to blow machines ({BLOW_MACHINE_PARENT!r})."
        ),
    ),
) -> CostCentreListResponse:
    """List Tally cost centres, optionally filtered by parent."""
    repo = TallyCostCentreRepository(session)
    parent_filter = (parent or "").strip() or BLOW_MACHINE_PARENT
    rows = await repo.list_by_parent(parent_filter)
    items = [
        CostCentreItemResponse(
            id=row.id,
            name=(row.name or "").strip(),
            parent=(row.parent or "").strip() or None,
        )
        for row in rows
        if (row.name or "").strip()
    ]
    return CostCentreListResponse(items=items)
