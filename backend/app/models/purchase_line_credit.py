"""Persisted per-line credit notes keyed by purchase sync_key."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

_NUMERIC = Numeric(18, 2)


class YorapetPurchaseLineCredit(Base):
    """Manual credit-note allocation for one purchase line (survives Tally sync)."""

    __tablename__ = "yorapet_purchase_line_credit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sync_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    credit_note: Mapped[Decimal] = mapped_column(_NUMERIC, default=Decimal("0"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
