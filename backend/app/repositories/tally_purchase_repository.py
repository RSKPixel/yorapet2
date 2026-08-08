"""Read-only access to tallydata_purchases."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.legacy.tally_purchase import TallyPurchase


class TallyPurchaseRepository:
    """Query legacy purchase lines from Tally."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[TallyPurchase]:
        result = await self._session.execute(
            select(TallyPurchase).order_by(
                TallyPurchase.voucher_date.desc(),
                TallyPurchase.voucher_no.desc(),
                TallyPurchase.itemno.asc(),
            ),
        )
        return list(result.scalars().all())
