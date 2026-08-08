"""Read-only access to tallydata_inventorymaster."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.legacy.tally_inventory_master import TallyInventoryMaster


class TallyInventoryMasterRepository:
    """Read inventory master rows from Tally sync tables."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[TallyInventoryMaster]:
        """Return all inventory master rows ordered by stock item."""
        result = await self._session.execute(
            select(TallyInventoryMaster).order_by(
                TallyInventoryMaster.stock_item.asc(),
                TallyInventoryMaster.id.asc(),
            ),
        )
        return list(result.scalars().all())

    async def get_by_stock_item(self, stock_item: str) -> TallyInventoryMaster | None:
        """Return the first Tally row matching stock_item (case-insensitive)."""
        normalized = stock_item.strip()
        if not normalized:
            return None
        rows = await self.list_all()
        needle = normalized.lower()
        for row in rows:
            item = (row.stock_item or "").strip()
            if item.lower() == needle:
                return row
        return None

    async def stock_group_by_item(self) -> dict[str, str]:
        """Return lowercased stock_item → stock_group."""
        result = await self._session.execute(
            select(
                TallyInventoryMaster.stock_item,
                TallyInventoryMaster.stock_group,
            ).where(
                TallyInventoryMaster.stock_item.is_not(None),
                TallyInventoryMaster.stock_item != "",
            ),
        )
        mapping: dict[str, str] = {}
        for stock_item, stock_group in result.all():
            item = (stock_item or "").strip()
            group = (stock_group or "").strip()
            if not item or not group:
                continue
            mapping[item.lower()] = group
        return mapping
