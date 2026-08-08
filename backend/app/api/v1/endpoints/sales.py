"""Sales report API endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.dependencies.auth import CurrentUserDep
from app.dependencies.database import DbSessionDep
from app.repositories.sale_repository import SaleRepository
from app.schemas.sales import SaleLineResponse, SaleListResponse

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("", response_model=SaleListResponse)
async def list_sales(
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> SaleListResponse:
    """List synced sales lines from yorapet_sales."""
    rows = await SaleRepository(session).list_for_report()
    return SaleListResponse(
        items=[SaleLineResponse.model_validate(row) for row in rows],
    )
