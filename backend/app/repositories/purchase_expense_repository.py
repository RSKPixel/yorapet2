"""Persistence for yorapet_purchase_expense."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.purchase_expense import YorapetPurchaseExpense
from app.services.voucher_identity import voucher_dates_equal


class PurchaseExpenseRepository:
    """SQLAlchemy persistence for voucher-level purchase expenses."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[YorapetPurchaseExpense]:
        result = await self._session.execute(
            select(YorapetPurchaseExpense).order_by(
                YorapetPurchaseExpense.voucher_date.asc(),
                YorapetPurchaseExpense.voucher_no.asc(),
            ),
        )
        return list(result.scalars().all())

    async def get_by_voucher(
        self,
        voucher_no: str,
        voucher_date: datetime | None,
    ) -> YorapetPurchaseExpense | None:
        normalized = voucher_no.strip()
        if not normalized:
            return None
        needle = normalized.casefold()
        for candidate in await self.list_all():
            if candidate.voucher_no.strip().casefold() != needle:
                continue
            if voucher_dates_equal(candidate.voucher_date, voucher_date):
                return candidate
        return None

    def add(self, row: YorapetPurchaseExpense) -> None:
        self._session.add(row)
