"""Read-only access to tallydata_stockposition."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.legacy.tally_stock_position import TallyStockPosition


class TallyStockPositionRepository:
    """List closing stock rows from Tally stock position."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[TallyStockPosition]:
        result = await self._session.execute(
            select(TallyStockPosition).order_by(
                TallyStockPosition.stock_group.asc(),
                TallyStockPosition.stock_item.asc(),
                TallyStockPosition.id.asc(),
            ),
        )
        return list(result.scalars().all())

    async def get_by_stock_item(self, stock_item: str) -> TallyStockPosition | None:
        item = stock_item.strip()
        if not item:
            return None
        result = await self._session.execute(
            select(TallyStockPosition).where(TallyStockPosition.stock_item == item),
        )
        return result.scalar_one_or_none()
