"""Persistence for yorapet_purchase_line_credit."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.purchase_line_credit import YorapetPurchaseLineCredit


class PurchaseLineCreditRepository:
    """SQLAlchemy persistence for sync_key-keyed line credit notes."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[YorapetPurchaseLineCredit]:
        result = await self._session.execute(select(YorapetPurchaseLineCredit))
        return list(result.scalars().all())

    async def get_by_sync_key(self, sync_key: str) -> YorapetPurchaseLineCredit | None:
        key = sync_key.strip()
        if not key:
            return None
        result = await self._session.execute(
            select(YorapetPurchaseLineCredit).where(
                YorapetPurchaseLineCredit.sync_key == key,
            ),
        )
        return result.scalar_one_or_none()

    def add(self, row: YorapetPurchaseLineCredit) -> None:
        self._session.add(row)
