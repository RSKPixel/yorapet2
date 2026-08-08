"""Inventory master API (Tally read + app extras)."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, UploadFile, status
from fastapi.responses import Response

from app.dependencies.auth import CurrentUserDep
from app.dependencies.database import DbSessionDep
from app.repositories.inventory_extra_repository import InventoryExtraRepository
from app.repositories.inventory_image_repository import InventoryImageRepository
from app.repositories.tally_inventory_master_repository import (
    TallyInventoryMasterRepository,
)
from app.schemas.inventory_master import (
    InventoryMasterItemResponse,
    InventoryMasterListResponse,
    UpsertInventoryExtraRequest,
)
from app.services.inventory_master_service import InventoryMasterService

router = APIRouter(prefix="/inventory-master", tags=["inventory-master"])


def _service(session: DbSessionDep) -> InventoryMasterService:
    return InventoryMasterService(
        TallyInventoryMasterRepository(session),
        InventoryExtraRepository(session),
        InventoryImageRepository(session),
    )


@router.get("", response_model=InventoryMasterListResponse)
async def list_inventory_master(
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> InventoryMasterListResponse:
    """List Tally inventory items joined with app-owned extras."""
    items = await _service(session).list_items()
    return InventoryMasterListResponse(items=items)


@router.put("", response_model=InventoryMasterItemResponse)
async def upsert_inventory_extra(
    payload: UpsertInventoryExtraRequest,
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> InventoryMasterItemResponse:
    """Create or update app-owned fields for a stock item."""
    return await _service(session).upsert_extra(payload)


@router.get("/image")
async def get_inventory_image(
    image_id: int,
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> Response:
    """Return image bytes stored in yorapet_inventory_image."""
    data, content_type = await _service(session).get_image(image_id)
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "private, no-cache"},
    )


@router.post(
    "/image",
    response_model=InventoryMasterItemResponse,
    status_code=status.HTTP_200_OK,
)
async def upload_inventory_image(
    _user: CurrentUserDep,
    session: DbSessionDep,
    stock_item: str = Form(...),
    file: UploadFile = File(...),
) -> InventoryMasterItemResponse:
    """Add an image for a stock item (max 4)."""
    return await _service(session).upload_image(
        stock_item=stock_item,
        upload=file,
    )


@router.delete("/image", response_model=InventoryMasterItemResponse)
async def delete_inventory_image(
    image_id: int,
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> InventoryMasterItemResponse:
    """Remove one image for a stock item."""
    return await _service(session).delete_image(image_id)
