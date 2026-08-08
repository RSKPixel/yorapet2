"""Tally data sync API endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.dependencies.auth import CurrentUserDep
from app.dependencies.database import DbSessionDep
from app.repositories.purchase_repository import PurchaseRepository
from app.repositories.sale_repository import SaleRepository
from app.repositories.tally_purchase_repository import TallyPurchaseRepository
from app.repositories.tally_sale_repository import TallySaleRepository
from app.schemas.tally_data import TallySyncSessionResponse
from app.services.purchase_costing import PurchaseCostingService
from app.services.tally_sync_service import TallySyncService

router = APIRouter(prefix="/tally-data", tags=["tally-data"])


@router.post("/sync", response_model=TallySyncSessionResponse)
async def sync_tally_data(
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> TallySyncSessionResponse:
    """Compare tallydata tables and sync into yorapet_* application tables."""
    result = await TallySyncService(
        TallyPurchaseRepository(session),
        PurchaseRepository(session),
        TallySaleRepository(session),
        SaleRepository(session),
    ).sync()
    costing = PurchaseCostingService(session)
    # Restore manual line credits by sync_key, then re-apply expense allocation.
    await costing.restore_line_credits()
    await costing.recalculate_all_with_overlays()
    return result
