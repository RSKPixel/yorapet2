"""Persistence for yorapet_purchase_credit_note."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.purchase_credit_note import YorapetPurchaseCreditNote
from app.services.voucher_identity import voucher_dates_equal


class PurchaseCreditNoteRepository:
    """SQLAlchemy persistence for voucher+item credit notes."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[YorapetPurchaseCreditNote]:
        result = await self._session.execute(
            select(YorapetPurchaseCreditNote).order_by(
                YorapetPurchaseCreditNote.voucher_date.asc(),
                YorapetPurchaseCreditNote.voucher_no.asc(),
                YorapetPurchaseCreditNote.stock_item.asc(),
            ),
        )
        return list(result.scalars().all())

    async def list_for_voucher(
        self,
        voucher_no: str,
        voucher_date: datetime | None,
    ) -> list[YorapetPurchaseCreditNote]:
        normalized = voucher_no.strip()
        if not normalized:
            return []
        needle = normalized.casefold()
        return [
            row
            for row in await self.list_all()
            if row.voucher_no.strip().casefold() == needle
            and voucher_dates_equal(row.voucher_date, voucher_date)
        ]

    async def get_by_voucher_and_item(
        self,
        voucher_no: str,
        voucher_date: datetime | None,
        stock_item: str,
    ) -> YorapetPurchaseCreditNote | None:
        voucher = voucher_no.strip()
        item = stock_item.strip()
        if not voucher or not item:
            return None
        voucher_key = voucher.casefold()
        item_key = item.casefold()
        for candidate in await self.list_all():
            if candidate.voucher_no.strip().casefold() != voucher_key:
                continue
            if candidate.stock_item.strip().casefold() != item_key:
                continue
            if voucher_dates_equal(candidate.voucher_date, voucher_date):
                return candidate
        return None

    def add(self, row: YorapetPurchaseCreditNote) -> None:
        self._session.add(row)
