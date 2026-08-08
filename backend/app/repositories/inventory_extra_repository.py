"""Persistence for yorapet_inventory_extra."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory_extra import YorapetInventoryExtra


class InventoryExtraRepository:
    """SQLAlchemy persistence for inventory extras."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[YorapetInventoryExtra]:
        result = await self._session.execute(select(YorapetInventoryExtra))
        return list(result.scalars().all())

    async def get_by_stock_item(self, stock_item: str) -> YorapetInventoryExtra | None:
        normalized = stock_item.strip()
        if not normalized:
            return None
        result = await self._session.execute(
            select(YorapetInventoryExtra).where(
                YorapetInventoryExtra.stock_item == normalized,
            ),
        )
        row = result.scalar_one_or_none()
        if row is not None:
            return row
        # Case-insensitive fallback for Tally name drift.
        result = await self._session.execute(select(YorapetInventoryExtra))
        needle = normalized.lower()
        for candidate in result.scalars().all():
            if candidate.stock_item.strip().lower() == needle:
                return candidate
        return None

    def add(self, row: YorapetInventoryExtra) -> None:
        self._session.add(row)
