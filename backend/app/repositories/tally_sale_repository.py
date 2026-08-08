"""Read-only access to tallydata_sales."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.legacy.tally_sale import TallySale


class TallySaleRepository:
    """Query legacy sales lines from Tally."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[TallySale]:
        result = await self._session.execute(
            select(TallySale).order_by(
                TallySale.voucher_date.desc(),
                TallySale.voucher_no.desc(),
                TallySale.item_no.asc(),
            ),
        )
        return list(result.scalars().all())
