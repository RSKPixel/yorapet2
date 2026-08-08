"""Purchase costing overlays: expenses and credit notes."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Query

from app.dependencies.auth import CurrentUserDep
from app.dependencies.database import DbSessionDep
from app.schemas.purchase_overlays import (
    PurchaseCostPreviewResponse,
    PurchaseCreditNoteListResponse,
    PurchaseCreditNoteResponse,
    PurchaseExpenseListResponse,
    PurchaseExpenseResponse,
    PurchaseStockItemListResponse,
    PurchaseVoucherListResponse,
    UpsertPurchaseCostingRequest,
    UpsertPurchaseCreditNoteRequest,
    UpsertPurchaseExpenseRequest,
)
from app.services.purchase_overlay_service import PurchaseOverlayService

router = APIRouter(prefix="/purchase-costing", tags=["purchase-costing"])


@router.get("/vouchers", response_model=PurchaseVoucherListResponse)
async def list_purchase_vouchers(
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> PurchaseVoucherListResponse:
    items = await PurchaseOverlayService(session).list_vouchers()
    return PurchaseVoucherListResponse(items=items)


@router.get("/stock-items", response_model=PurchaseStockItemListResponse)
async def list_voucher_stock_items(
    _user: CurrentUserDep,
    session: DbSessionDep,
    voucher_no: str = Query(min_length=1),
    voucher_date: datetime | None = None,
) -> PurchaseStockItemListResponse:
    items = await PurchaseOverlayService(session).list_stock_items(
        voucher_no,
        voucher_date,
    )
    return PurchaseStockItemListResponse(items=items)


@router.get("/expenses", response_model=PurchaseExpenseListResponse)
async def list_expenses(
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> PurchaseExpenseListResponse:
    items = await PurchaseOverlayService(session).list_expenses()
    return PurchaseExpenseListResponse(items=items)


@router.get("/expenses/by-voucher", response_model=PurchaseExpenseResponse | None)
async def get_expense_by_voucher(
    _user: CurrentUserDep,
    session: DbSessionDep,
    voucher_no: str = Query(min_length=1),
    voucher_date: datetime | None = None,
) -> PurchaseExpenseResponse | None:
    return await PurchaseOverlayService(session).get_expense(
        voucher_no,
        voucher_date,
    )


@router.put("/expenses", response_model=PurchaseExpenseResponse)
async def upsert_expense(
    payload: UpsertPurchaseExpenseRequest,
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> PurchaseExpenseResponse:
    return await PurchaseOverlayService(session).upsert_expense(payload)


@router.put("", response_model=PurchaseCostPreviewResponse)
async def upsert_purchase_costing(
    payload: UpsertPurchaseCostingRequest,
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> PurchaseCostPreviewResponse:
    """Save expenses + voucher credit note + manual line credit notes."""
    return await PurchaseOverlayService(session).upsert_costing(payload)


@router.get("/credit-notes", response_model=PurchaseCreditNoteListResponse)
async def list_credit_notes(
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> PurchaseCreditNoteListResponse:
    items = await PurchaseOverlayService(session).list_credit_notes()
    return PurchaseCreditNoteListResponse(items=items)


@router.get(
    "/credit-notes/by-voucher-item",
    response_model=PurchaseCreditNoteResponse | None,
)
async def get_credit_note_by_voucher_item(
    _user: CurrentUserDep,
    session: DbSessionDep,
    voucher_no: str = Query(min_length=1),
    stock_item: str = Query(min_length=1),
    voucher_date: datetime | None = None,
) -> PurchaseCreditNoteResponse | None:
    return await PurchaseOverlayService(session).get_credit_note(
        voucher_no,
        stock_item,
        voucher_date,
    )


@router.put("/credit-notes", response_model=PurchaseCreditNoteResponse)
async def upsert_credit_note(
    payload: UpsertPurchaseCreditNoteRequest,
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> PurchaseCreditNoteResponse:
    return await PurchaseOverlayService(session).upsert_credit_note(payload)


@router.get("/preview", response_model=PurchaseCostPreviewResponse)
async def preview_voucher_costing(
    _user: CurrentUserDep,
    session: DbSessionDep,
    voucher_no: str = Query(min_length=1),
    voucher_date: datetime | None = None,
) -> PurchaseCostPreviewResponse:
    return await PurchaseOverlayService(session).preview_voucher(
        voucher_no,
        voucher_date,
    )
