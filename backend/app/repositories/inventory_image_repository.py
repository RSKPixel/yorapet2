"""Persistence for yorapet_inventory_image."""

from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from app.models.inventory_image import YorapetInventoryImage


class InventoryImageRepository:
    """SQLAlchemy persistence for inventory images."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_meta_all(self) -> list[YorapetInventoryImage]:
        """List image metadata without loading BLOB payloads."""
        result = await self._session.execute(
            select(YorapetInventoryImage).order_by(
                YorapetInventoryImage.stock_item.asc(),
                YorapetInventoryImage.position.asc(),
                YorapetInventoryImage.id.asc(),
            ),
        )
        return list(result.scalars().all())

    async def list_for_stock_item(self, stock_item: str) -> list[YorapetInventoryImage]:
        result = await self._session.execute(
            select(YorapetInventoryImage)
            .where(YorapetInventoryImage.stock_item == stock_item)
            .order_by(
                YorapetInventoryImage.position.asc(),
                YorapetInventoryImage.id.asc(),
            ),
        )
        return list(result.scalars().all())

    async def get_by_id(self, image_id: int) -> YorapetInventoryImage | None:
        result = await self._session.execute(
            select(YorapetInventoryImage)
            .options(undefer(YorapetInventoryImage.image_data))
            .where(YorapetInventoryImage.id == image_id),
        )
        return result.scalar_one_or_none()

    def add(self, row: YorapetInventoryImage) -> None:
        self._session.add(row)

    async def add_and_flush(self, row: YorapetInventoryImage) -> None:
        self._session.add(row)
        await self._session.flush()

    async def flush(self) -> None:
        await self._session.flush()

    async def delete_by_id(self, image_id: int) -> int:
        result = await self._session.execute(
            delete(YorapetInventoryImage).where(YorapetInventoryImage.id == image_id),
        )
        await self._session.flush()
        return int(result.rowcount or 0)
