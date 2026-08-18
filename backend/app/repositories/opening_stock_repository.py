"""Database operations for opening stock balances."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.opening_stock import YorapetOpeningStock


class OpeningStockRepository:
    """SQLAlchemy persistence for yorapet_opening_stock."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[YorapetOpeningStock]:
        result = await self._session.execute(
            select(YorapetOpeningStock).order_by(
                YorapetOpeningStock.opening_date.asc(),
                YorapetOpeningStock.id.asc(),
            ),
        )
        return list(result.scalars().all())

    async def opening_rate_by_item(self) -> dict[str, float]:
        """Return lowercased stock_item → opening_rate for FIFO seed layers."""
        rates: dict[str, float] = {}
        for row in await self.list_all():
            item = (row.stock_item or "").strip()
            if not item or row.opening_rate is None:
                continue
            rates[item.lower()] = float(row.opening_rate)
        return rates
