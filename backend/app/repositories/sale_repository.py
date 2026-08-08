"""Database operations for synced sales records."""

from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sale import YorapetSale


class SaleRepository:
    """SQLAlchemy persistence for yorapet_sales."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[YorapetSale]:
        result = await self._session.execute(
            select(YorapetSale).order_by(YorapetSale.sync_key.asc()),
        )
        return list(result.scalars().all())

    async def list_for_report(self) -> list[YorapetSale]:
        result = await self._session.execute(
            select(YorapetSale).order_by(
                YorapetSale.voucher_date.desc(),
                YorapetSale.voucher_no.asc(),
                YorapetSale.item_no.asc(),
                YorapetSale.id.asc(),
            ),
        )
        return list(result.scalars().all())

    def add(self, sale: YorapetSale) -> None:
        self._session.add(sale)

    async def delete_by_sync_keys(self, sync_keys: list[str]) -> int:
        if not sync_keys:
            return 0
        result = await self._session.execute(
            delete(YorapetSale).where(
                YorapetSale.sync_key.in_(sync_keys),
            ),
        )
        return int(result.rowcount or 0)
