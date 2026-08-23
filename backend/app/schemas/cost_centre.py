"""Cost centre list schemas (Tally read-only)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CostCentreItemResponse(BaseModel):
    """One Tally cost centre."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    parent: str | None = None


class CostCentreListResponse(BaseModel):
    """Cost centres for dropdowns (e.g. blow machines)."""

    items: list[CostCentreItemResponse] = Field(default_factory=list)
