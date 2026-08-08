"""Inventory master service: Tally rows + app-owned extras + images."""

from __future__ import annotations

from collections import defaultdict

from fastapi import UploadFile

from app.core.exceptions import AppError, NotFoundError
from app.models.inventory_extra import YorapetInventoryExtra
from app.models.inventory_image import MAX_INVENTORY_IMAGES, YorapetInventoryImage
from app.repositories.inventory_extra_repository import InventoryExtraRepository
from app.repositories.inventory_image_repository import InventoryImageRepository
from app.repositories.tally_inventory_master_repository import (
    TallyInventoryMasterRepository,
)
from app.schemas.inventory_master import (
    InventoryImageResponse,
    InventoryMasterItemResponse,
    UpsertInventoryExtraRequest,
)

_ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
_MAX_IMAGE_BYTES = 5 * 1024 * 1024


def image_url_for(image_id: int, *, updated_at: object | None = None) -> str:
    """API URL for an inventory image stored in yorapet_inventory_image."""
    query = f"image_id={image_id}"
    if updated_at is not None:
        stamp = getattr(updated_at, "timestamp", None)
        if callable(stamp):
            query = f"{query}&t={int(stamp())}"
    return f"/api/v1/inventory-master/image?{query}"


class InventoryMasterService:
    """Combine tallydata_inventorymaster with yorapet_inventory_extra."""

    def __init__(
        self,
        tally_repo: TallyInventoryMasterRepository,
        extra_repo: InventoryExtraRepository,
        image_repo: InventoryImageRepository,
    ) -> None:
        self._tally = tally_repo
        self._extras = extra_repo
        self._images = image_repo

    def _image_responses(
        self,
        images: list[YorapetInventoryImage],
    ) -> list[InventoryImageResponse]:
        return [
            InventoryImageResponse(
                id=image.id,
                position=image.position,
                url=image_url_for(image.id, updated_at=image.updated_at),
            )
            for image in sorted(images, key=lambda row: (row.position, row.id))
        ]

    def _to_item(
        self,
        *,
        tally_id: int,
        stock_item: str,
        packing: float | None,
        stock_group: str | None,
        base_unit: str | None,
        additional_unit: str | None,
        extra: YorapetInventoryExtra | None,
        images: list[YorapetInventoryImage],
    ) -> InventoryMasterItemResponse:
        return InventoryMasterItemResponse(
            tally_id=tally_id,
            stock_item=stock_item,
            packing=packing,
            stock_group=stock_group,
            base_unit=base_unit,
            additional_unit=additional_unit,
            images=self._image_responses(images),
            weight=extra.weight if extra else None,
            neck_size=extra.neck_size if extra else None,
            qty_per_box=extra.qty_per_box if extra else None,
            box_dimension=extra.box_dimension if extra else None,
            reorder_level=extra.reorder_level if extra else None,
        )

    async def _images_for_item(self, stock_item: str) -> list[YorapetInventoryImage]:
        return await self._images.list_for_stock_item(stock_item)

    async def list_items(self) -> list[InventoryMasterItemResponse]:
        tally_rows = await self._tally.list_all()
        extras = await self._extras.list_all()
        extras_by_item = {
            row.stock_item.strip().lower(): row
            for row in extras
            if row.stock_item and row.stock_item.strip()
        }
        images_by_item: dict[str, list[YorapetInventoryImage]] = defaultdict(list)
        for image in await self._images.list_meta_all():
            key = image.stock_item.strip().lower()
            if key:
                images_by_item[key].append(image)

        items: list[InventoryMasterItemResponse] = []
        for row in tally_rows:
            stock_item = (row.stock_item or "").strip()
            if not stock_item:
                continue
            key = stock_item.lower()
            items.append(
                self._to_item(
                    tally_id=row.id,
                    stock_item=stock_item,
                    packing=row.packing,
                    stock_group=(row.stock_group or "").strip() or None,
                    base_unit=(row.base_unit or "").strip() or None,
                    additional_unit=(row.additional_unit or "").strip() or None,
                    extra=extras_by_item.get(key),
                    images=images_by_item.get(key, []),
                ),
            )
        return items

    async def upsert_extra(
        self,
        payload: UpsertInventoryExtraRequest,
    ) -> InventoryMasterItemResponse:
        tally = await self._tally.get_by_stock_item(payload.stock_item)
        if tally is None or not (tally.stock_item or "").strip():
            raise NotFoundError(
                "Stock item was not found in Tally inventory master.",
            )

        stock_item = (tally.stock_item or "").strip()
        extra = await self._extras.get_by_stock_item(stock_item)
        if extra is None:
            extra = YorapetInventoryExtra(stock_item=stock_item)
            self._extras.add(extra)

        extra.stock_item = stock_item
        extra.weight = payload.weight
        extra.neck_size = payload.neck_size
        extra.qty_per_box = payload.qty_per_box
        extra.box_dimension = payload.box_dimension
        extra.reorder_level = payload.reorder_level

        return self._to_item(
            tally_id=tally.id,
            stock_item=stock_item,
            packing=tally.packing,
            stock_group=(tally.stock_group or "").strip() or None,
            base_unit=(tally.base_unit or "").strip() or None,
            additional_unit=(tally.additional_unit or "").strip() or None,
            extra=extra,
            images=await self._images_for_item(stock_item),
        )

    async def upload_image(
        self,
        *,
        stock_item: str,
        upload: UploadFile,
    ) -> InventoryMasterItemResponse:
        tally = await self._tally.get_by_stock_item(stock_item)
        if tally is None or not (tally.stock_item or "").strip():
            raise NotFoundError(
                "Stock item was not found in Tally inventory master.",
            )

        content_type = (upload.content_type or "").lower().strip()
        if content_type not in _ALLOWED_IMAGE_TYPES:
            raise AppError(
                "Image must be JPEG, PNG, WebP, or GIF.",
                code="invalid_image_type",
                status_code=400,
            )

        data = await upload.read(_MAX_IMAGE_BYTES + 1)
        if len(data) > _MAX_IMAGE_BYTES:
            raise AppError(
                "Image must be 5 MB or smaller.",
                code="image_too_large",
                status_code=400,
            )
        if not data:
            raise AppError(
                "Uploaded image file is empty.",
                code="empty_image",
                status_code=400,
            )

        resolved_item = (tally.stock_item or "").strip()
        existing = await self._images_for_item(resolved_item)
        if len(existing) >= MAX_INVENTORY_IMAGES:
            raise AppError(
                f"At most {MAX_INVENTORY_IMAGES} images are allowed per stock item.",
                code="image_limit_reached",
                status_code=400,
            )

        used_positions = {image.position for image in existing}
        position = next(
            (
                slot
                for slot in range(1, MAX_INVENTORY_IMAGES + 1)
                if slot not in used_positions
            ),
            None,
        )
        if position is None:
            raise AppError(
                f"At most {MAX_INVENTORY_IMAGES} images are allowed per stock item.",
                code="image_limit_reached",
                status_code=400,
            )

        extra = await self._extras.get_by_stock_item(resolved_item)
        if extra is None:
            extra = YorapetInventoryExtra(stock_item=resolved_item)
            self._extras.add(extra)

        await self._images.add_and_flush(
            YorapetInventoryImage(
                stock_item=resolved_item,
                position=position,
                image_content_type=content_type,
                image_data=data,
            ),
        )

        return self._to_item(
            tally_id=tally.id,
            stock_item=resolved_item,
            packing=tally.packing,
            stock_group=(tally.stock_group or "").strip() or None,
            base_unit=(tally.base_unit or "").strip() or None,
            additional_unit=(tally.additional_unit or "").strip() or None,
            extra=extra,
            images=await self._images_for_item(resolved_item),
        )

    async def get_image(self, image_id: int) -> tuple[bytes, str]:
        image = await self._images.get_by_id(image_id)
        if image is None or not image.image_data:
            raise NotFoundError("No image found for this stock item.")
        return image.image_data, image.image_content_type

    async def delete_image(self, image_id: int) -> InventoryMasterItemResponse:
        image = await self._images.get_by_id(image_id)
        if image is None:
            raise NotFoundError("No image found for this stock item.")

        stock_item = image.stock_item.strip()
        tally = await self._tally.get_by_stock_item(stock_item)
        if tally is None or not (tally.stock_item or "").strip():
            raise NotFoundError(
                "Stock item was not found in Tally inventory master.",
            )

        await self._images.delete_by_id(image_id)
        remaining = await self._images_for_item(stock_item)
        # Compact positions to 1..n after delete.
        for index, row in enumerate(sorted(remaining, key=lambda r: (r.position, r.id)), start=1):
            row.position = index
        if remaining:
            await self._images.flush()

        resolved_item = (tally.stock_item or "").strip()
        extra = await self._extras.get_by_stock_item(resolved_item)
        return self._to_item(
            tally_id=tally.id,
            stock_item=resolved_item,
            packing=tally.packing,
            stock_group=(tally.stock_group or "").strip() or None,
            base_unit=(tally.base_unit or "").strip() or None,
            additional_unit=(tally.additional_unit or "").strip() or None,
            extra=extra,
            images=await self._images_for_item(resolved_item),
        )
