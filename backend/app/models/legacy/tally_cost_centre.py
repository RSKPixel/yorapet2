"""Read-only legacy model for tallydata_costcentre."""

from __future__ import annotations

from app.db.base import LegacyBase
from sqlalchemy import BigInteger, Text
from sqlalchemy.orm import Mapped, mapped_column


class TallyCostCentre(LegacyBase):
    """Cost centre master synced from Tally via tallysync."""

    __tablename__ = "tallydata_costcentre"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str | None] = mapped_column(Text)
    parent: Mapped[str | None] = mapped_column(Text)
