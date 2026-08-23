"""Read-only access to tallydata_costcentre."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.legacy.tally_cost_centre import TallyCostCentre

BLOW_MACHINE_PARENT = "Blow Mould Machine"


class TallyCostCentreRepository:
    """Read cost centre rows from Tally sync tables."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_parent(self, parent: str) -> list[TallyCostCentre]:
        """Return cost centres under ``parent``, ordered by name."""
        normalized = parent.strip()
        if not normalized:
            return []
        result = await self._session.execute(
            select(TallyCostCentre)
            .where(
                TallyCostCentre.parent.is_not(None),
                func.trim(TallyCostCentre.parent) == normalized,
                TallyCostCentre.name.is_not(None),
                func.trim(TallyCostCentre.name) != "",
            )
            .order_by(TallyCostCentre.name.asc(), TallyCostCentre.id.asc()),
        )
        return list(result.scalars().all())

    async def list_blow_machines(self) -> list[TallyCostCentre]:
        """Return blow-machine cost centres for Production (Blowing)."""
        return await self.list_by_parent(BLOW_MACHINE_PARENT)
