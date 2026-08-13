"""Stock summary report API endpoints."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Query

from app.dependencies.auth import CurrentUserDep
from app.dependencies.database import DbSessionDep
from app.repositories.opening_stock_repository import OpeningStockRepository
from app.repositories.purchase_repository import PurchaseRepository
from app.repositories.sale_repository import SaleRepository
from app.repositories.tally_inventory_master_repository import (
    TallyInventoryMasterRepository,
)
from app.schemas.stock_summary import StockSummaryResponse
from app.services.stock_summary_service import StockSummaryService

router = APIRouter(prefix="/stock-summary", tags=["stock-summary"])


@router.get("", response_model=StockSummaryResponse)
async def get_stock_summary(
    _user: CurrentUserDep,
    session: DbSessionDep,
    as_on: date = Query(..., description="As-on date (inclusive)"),
) -> StockSummaryResponse:
    """Return closing qty/value plus 30-day sales reorder level as on date."""
    return await StockSummaryService(
        OpeningStockRepository(session),
        PurchaseRepository(session),
        SaleRepository(session),
        TallyInventoryMasterRepository(session),
    ).summarize(as_on=as_on)
