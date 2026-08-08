"""Purchases report API endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.dependencies.auth import CurrentUserDep
from app.dependencies.database import DbSessionDep
from app.repositories.purchase_repository import PurchaseRepository
from app.schemas.purchases import PurchaseLineResponse, PurchaseListResponse

router = APIRouter(prefix="/purchases", tags=["purchases"])


@router.get("", response_model=PurchaseListResponse)
async def list_purchases(
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> PurchaseListResponse:
    """List synced purchase lines from yorapet_purchase."""
    rows = await PurchaseRepository(session).list_for_report()
    return PurchaseListResponse(
        items=[PurchaseLineResponse.model_validate(row) for row in rows],
    )
