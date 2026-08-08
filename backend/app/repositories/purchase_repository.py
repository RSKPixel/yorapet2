"""Database operations for synced purchase records."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.purchase import YorapetPurchase
from app.services.voucher_identity import (
    normalize_voucher_date,
    voucher_dates_equal,
    voucher_option_key,
)


class PurchaseRepository:
    """SQLAlchemy persistence for yorapet_purchase."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[YorapetPurchase]:
        result = await self._session.execute(
            select(YorapetPurchase).order_by(YorapetPurchase.sync_key.asc()),
        )
        return list(result.scalars().all())

    async def list_for_report(self) -> list[YorapetPurchase]:
        result = await self._session.execute(
            select(YorapetPurchase).order_by(
                YorapetPurchase.voucher_date.desc(),
                YorapetPurchase.voucher_no.asc(),
                YorapetPurchase.itemno.asc(),
                YorapetPurchase.id.asc(),
            ),
        )
        return list(result.scalars().all())

    async def list_distinct_voucher_nos(self) -> list[str]:
        result = await self._session.execute(
            select(YorapetPurchase.voucher_no)
            .where(YorapetPurchase.voucher_no.is_not(None))
            .distinct()
            .order_by(YorapetPurchase.voucher_no.asc()),
        )
        return [
            str(value).strip()
            for value in result.scalars().all()
            if value and str(value).strip()
        ]

    async def list_voucher_options(self) -> list[dict[str, object]]:
        """One summary row per voucher_no + voucher_date."""
        rows = await self.list_for_report()
        by_voucher: dict[str, dict[str, object]] = {}
        for row in rows:
            voucher_no = (row.voucher_no or "").strip()
            if not voucher_no:
                continue
            key = voucher_option_key(voucher_no, row.voucher_date)
            existing = by_voucher.get(key)
            if existing is None:
                by_voucher[key] = {
                    "voucher_no": voucher_no,
                    "voucher_date": normalize_voucher_date(row.voucher_date),
                    "vendor": (row.ledger_name or "").strip() or None,
                }
                continue
            if existing.get("vendor") is None and (row.ledger_name or "").strip():
                existing["vendor"] = row.ledger_name.strip()

        def sort_key(item: dict[str, object]) -> tuple[int, float, str]:
            date = item.get("voucher_date")
            voucher = str(item["voucher_no"]).casefold()
            if not isinstance(date, datetime):
                return (1, 0.0, voucher)
            return (0, date.timestamp(), voucher)

        return sorted(by_voucher.values(), key=sort_key)

    async def list_by_voucher(
        self,
        voucher_no: str,
        voucher_date: datetime | None = None,
    ) -> list[YorapetPurchase]:
        normalized = voucher_no.strip()
        if not normalized:
            return []
        needle = normalized.casefold()
        all_rows = await self.list_all()
        matched = [
            row
            for row in all_rows
            if (row.voucher_no or "").strip().casefold() == needle
            and (
                voucher_date is None
                or voucher_dates_equal(row.voucher_date, voucher_date)
            )
        ]
        return sorted(
            matched,
            key=lambda row: (row.itemno or 0, row.id or 0),
        )

    async def list_by_voucher_no(self, voucher_no: str) -> list[YorapetPurchase]:
        return await self.list_by_voucher(voucher_no, voucher_date=None)

    async def list_stock_items_for_voucher(
        self,
        voucher_no: str,
        voucher_date: datetime | None = None,
    ) -> list[str]:
        lines = await self.list_by_voucher(voucher_no, voucher_date)
        seen: set[str] = set()
        items: list[str] = []
        for line in lines:
            name = (line.stock_item or "").strip()
            if not name:
                continue
            key = name.casefold()
            if key in seen:
                continue
            seen.add(key)
            items.append(name)
        return sorted(items, key=str.casefold)

    def add(self, purchase: YorapetPurchase) -> None:
        self._session.add(purchase)

    async def delete_by_sync_keys(self, sync_keys: list[str]) -> int:
        if not sync_keys:
            return 0
        result = await self._session.execute(
            delete(YorapetPurchase).where(
                YorapetPurchase.sync_key.in_(sync_keys),
            ),
        )
        return int(result.rowcount or 0)
