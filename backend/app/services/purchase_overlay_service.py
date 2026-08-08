"""Upsert purchase expense and credit note overlays; recalculate costs."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.purchase_credit_note import YorapetPurchaseCreditNote
from app.models.purchase_expense import YorapetPurchaseExpense
from app.models.purchase_line_credit import YorapetPurchaseLineCredit
from app.repositories.purchase_credit_note_repository import (
    PurchaseCreditNoteRepository,
)
from app.repositories.purchase_expense_repository import PurchaseExpenseRepository
from app.repositories.purchase_line_credit_repository import (
    PurchaseLineCreditRepository,
)
from app.repositories.purchase_repository import PurchaseRepository
from app.schemas.purchase_overlays import (
    PurchaseCostPreviewLine,
    PurchaseCostPreviewResponse,
    PurchaseCostPreviewTotals,
    PurchaseCreditNoteResponse,
    PurchaseExpenseResponse,
    PurchaseStockItemOption,
    PurchaseVoucherOption,
    UpsertPurchaseCostingRequest,
    UpsertPurchaseCreditNoteRequest,
    UpsertPurchaseExpenseRequest,
)
from app.services.purchase_costing import PurchaseCostingService
from app.services.voucher_identity import normalize_voucher_date


def _dec(value: Decimal | float | int | None) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


class PurchaseOverlayService:
    """Manage expense/credit overlays and keep purchase cost_* in sync."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._purchases = PurchaseRepository(session)
        self._expenses = PurchaseExpenseRepository(session)
        self._credits = PurchaseCreditNoteRepository(session)
        self._line_credits = PurchaseLineCreditRepository(session)
        self._costing = PurchaseCostingService(session)

    async def list_vouchers(self) -> list[PurchaseVoucherOption]:
        return [
            PurchaseVoucherOption(
                voucher_no=str(item["voucher_no"]),
                voucher_date=item.get("voucher_date"),  # type: ignore[arg-type]
                vendor=item.get("vendor"),  # type: ignore[arg-type]
            )
            for item in await self._purchases.list_voucher_options()
        ]

    async def list_stock_items(
        self,
        voucher_no: str,
        voucher_date: datetime | None = None,
    ) -> list[PurchaseStockItemOption]:
        voucher = voucher_no.strip()
        if not voucher:
            return []
        date = normalize_voucher_date(voucher_date)
        return [
            PurchaseStockItemOption(stock_item=item)
            for item in await self._purchases.list_stock_items_for_voucher(
                voucher,
                date,
            )
        ]

    async def list_expenses(self) -> list[PurchaseExpenseResponse]:
        rows = await self._expenses.list_all()
        return [PurchaseExpenseResponse.model_validate(row) for row in rows]

    async def get_expense(
        self,
        voucher_no: str,
        voucher_date: datetime | None = None,
    ) -> PurchaseExpenseResponse | None:
        row = await self._expenses.get_by_voucher(
            voucher_no,
            normalize_voucher_date(voucher_date),
        )
        if row is None:
            return None
        return PurchaseExpenseResponse.model_validate(row)

    async def upsert_expense(
        self,
        payload: UpsertPurchaseExpenseRequest,
    ) -> PurchaseExpenseResponse:
        voucher_no = payload.voucher_no.strip()
        voucher_date = normalize_voucher_date(payload.voucher_date)
        if not voucher_no:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="voucher_no is required",
            )
        if voucher_date is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="voucher_date is required",
            )
        lines = await self._purchases.list_by_voucher(voucher_no, voucher_date)
        if not lines:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No purchase lines for voucher {voucher_no}",
            )
        stored_voucher = (lines[0].voucher_no or voucher_no).strip()
        stored_date = normalize_voucher_date(lines[0].voucher_date) or voucher_date
        expenses = _dec(payload.expenses).quantize(Decimal("0.01"))

        row = await self._expenses.get_by_voucher(stored_voucher, stored_date)
        if row is None:
            row = YorapetPurchaseExpense(
                voucher_no=stored_voucher,
                voucher_date=stored_date,
                expenses=expenses,
                credit_note=Decimal("0"),
            )
            self._expenses.add(row)
        else:
            row.voucher_no = stored_voucher
            row.voucher_date = stored_date
            row.expenses = expenses

        await self._session.flush()
        await self._costing.recalculate_voucher(stored_voucher, stored_date)
        await self._session.flush()
        return PurchaseExpenseResponse.model_validate(row)

    async def upsert_costing(
        self,
        payload: UpsertPurchaseCostingRequest,
    ) -> PurchaseCostPreviewResponse:
        voucher_no = payload.voucher_no.strip()
        voucher_date = normalize_voucher_date(payload.voucher_date)
        if not voucher_no:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="voucher_no is required",
            )
        if voucher_date is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="voucher_date is required",
            )
        lines = await self._purchases.list_by_voucher(voucher_no, voucher_date)
        if not lines:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No purchase lines for voucher {voucher_no}",
            )
        stored_voucher = (lines[0].voucher_no or voucher_no).strip()
        stored_date = normalize_voucher_date(lines[0].voucher_date) or voucher_date
        expenses = _dec(payload.expenses).quantize(Decimal("0.01"))
        voucher_credit = _dec(payload.credit_note).quantize(Decimal("0.01"))

        by_id = {int(line.id): line for line in lines if line.id is not None}
        if len(payload.lines) != len(lines):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Credit note lines must include every purchase line",
            )
        seen: set[int] = set()
        line_sum = Decimal("0")
        for item in payload.lines:
            line = by_id.get(item.id)
            if line is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Purchase line {item.id} is not on this voucher",
                )
            if item.id in seen:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Duplicate purchase line {item.id}",
                )
            seen.add(item.id)
            credit = _dec(item.credit_note).quantize(Decimal("0.01"))
            line.credit_note = credit
            line_sum += credit
            await self._upsert_line_credit(line.sync_key, credit)

        if line_sum != voucher_credit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Sum of credit note column "
                    f"({line_sum}) must equal credit note ({voucher_credit})"
                ),
            )

        row = await self._expenses.get_by_voucher(stored_voucher, stored_date)
        if row is None:
            row = YorapetPurchaseExpense(
                voucher_no=stored_voucher,
                voucher_date=stored_date,
                expenses=expenses,
                credit_note=voucher_credit,
            )
            self._expenses.add(row)
        else:
            row.voucher_no = stored_voucher
            row.voucher_date = stored_date
            row.expenses = expenses
            row.credit_note = voucher_credit

        await self._session.flush()
        await self._costing.recalculate_voucher(stored_voucher, stored_date)
        await self._session.flush()
        return await self.preview_voucher(stored_voucher, stored_date)

    async def _upsert_line_credit(self, sync_key: str, credit: Decimal) -> None:
        row = await self._line_credits.get_by_sync_key(sync_key)
        if row is None:
            self._line_credits.add(
                YorapetPurchaseLineCredit(sync_key=sync_key, credit_note=credit),
            )
        else:
            row.credit_note = credit

    async def list_credit_notes(self) -> list[PurchaseCreditNoteResponse]:
        rows = await self._credits.list_all()
        return [PurchaseCreditNoteResponse.model_validate(row) for row in rows]

    async def get_credit_note(
        self,
        voucher_no: str,
        stock_item: str,
        voucher_date: datetime | None = None,
    ) -> PurchaseCreditNoteResponse | None:
        row = await self._credits.get_by_voucher_and_item(
            voucher_no,
            normalize_voucher_date(voucher_date),
            stock_item,
        )
        if row is None:
            return None
        return PurchaseCreditNoteResponse.model_validate(row)

    async def upsert_credit_note(
        self,
        payload: UpsertPurchaseCreditNoteRequest,
    ) -> PurchaseCreditNoteResponse:
        voucher_no = payload.voucher_no.strip()
        stock_item = payload.stock_item.strip()
        voucher_date = normalize_voucher_date(payload.voucher_date)
        if not voucher_no or not stock_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="voucher_no and stock_item are required",
            )
        if voucher_date is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="voucher_date is required",
            )
        lines = await self._purchases.list_by_voucher(voucher_no, voucher_date)
        if not lines:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No purchase lines for voucher {voucher_no}",
            )
        items = await self._purchases.list_stock_items_for_voucher(
            voucher_no,
            voucher_date,
        )
        item_match = next(
            (item for item in items if item.casefold() == stock_item.casefold()),
            None,
        )
        if item_match is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock item not found on voucher {voucher_no}",
            )
        stored_voucher = (lines[0].voucher_no or voucher_no).strip()
        stored_date = normalize_voucher_date(lines[0].voucher_date) or voucher_date
        credit = _dec(payload.credit_note).quantize(Decimal("0.01"))

        row = await self._credits.get_by_voucher_and_item(
            stored_voucher,
            stored_date,
            item_match,
        )
        if row is None:
            row = YorapetPurchaseCreditNote(
                voucher_no=stored_voucher,
                voucher_date=stored_date,
                stock_item=item_match,
                credit_note=credit,
            )
            self._credits.add(row)
        else:
            row.voucher_no = stored_voucher
            row.voucher_date = stored_date
            row.stock_item = item_match
            row.credit_note = credit

        await self._session.flush()
        return PurchaseCreditNoteResponse.model_validate(row)

    async def preview_voucher(
        self,
        voucher_no: str,
        voucher_date: datetime | None = None,
    ) -> PurchaseCostPreviewResponse:
        voucher = voucher_no.strip()
        date = normalize_voucher_date(voucher_date)
        lines = await self._purchases.list_by_voucher(voucher, date)
        if not lines:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No purchase lines for voucher {voucher}",
            )
        stored_date = normalize_voucher_date(lines[0].voucher_date) or date
        expense_row = await self._expenses.get_by_voucher(voucher, stored_date)
        preview_lines = [
            PurchaseCostPreviewLine(
                id=int(line.id),
                stock_item=(line.stock_item or "").strip(),
                qty=line.qty,
                box=line.box,
                qty_per_box=line.qty_per_box,
                amount=line.amount,
                value_addition=_dec(line.value_addition),
                credit_note=_dec(line.credit_note),
                cost_value=_dec(line.cost_value),
                cost_price=line.cost_price,
            )
            for line in lines
            if line.id is not None
        ]
        credit_total = sum(
            (_dec(line.credit_note) for line in lines),
            Decimal("0"),
        ).quantize(Decimal("0.01"))
        totals = PurchaseCostPreviewTotals(
            qty=sum((_dec(line.qty) for line in lines), Decimal("0")).quantize(
                Decimal("0.01"),
            ),
            boxes=sum((_dec(line.box) for line in lines), Decimal("0")).quantize(
                Decimal("0.01"),
            ),
            amount=sum((_dec(line.amount) for line in lines), Decimal("0")).quantize(
                Decimal("0.01"),
            ),
            credit_note=credit_total,
            cost_value=sum(
                (_dec(line.cost_value) for line in lines),
                Decimal("0"),
            ).quantize(Decimal("0.01")),
        )
        return PurchaseCostPreviewResponse(
            voucher_no=(lines[0].voucher_no or voucher).strip(),
            voucher_date=stored_date,
            vendor=(lines[0].ledger_name or "").strip() or None,
            expenses=_dec(expense_row.expenses if expense_row else 0),
            credit_note=_dec(expense_row.credit_note if expense_row else 0),
            lines=preview_lines,
            totals=totals,
        )
