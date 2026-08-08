"""Sync tallydata_* tables into application-owned yorapet_* tables.

Rules (per purchases / sales step):
1. Date window = min/max voucher_date from the tallydata_* snapshot.
2. Only yorapet_* rows inside that window are added to, updated, or deleted.
3. Add — voucher_no present in tallydata and absent from yorapet (in window).
4. Delete — voucher_no present in yorapet (in window) and absent from tallydata.
5. Update — voucher_no present in both: delete yorapet line(s) for that voucher
   (in window), then insert all tallydata lines for that voucher.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import TypeVar

from app.models.legacy.tally_purchase import TallyPurchase
from app.models.legacy.tally_sale import TallySale
from app.models.purchase import YorapetPurchase
from app.models.sale import YorapetSale
from app.repositories.purchase_repository import PurchaseRepository
from app.repositories.sale_repository import SaleRepository
from app.repositories.tally_purchase_repository import TallyPurchaseRepository
from app.repositories.tally_sale_repository import TallySaleRepository
from app.schemas.tally_data import TallySyncSessionResponse, TallySyncStepResult
from app.services.purchase_costing import apply_purchase_costing
from app.services.tally_sync_key import purchase_sync_key, sale_sync_key

TSource = TypeVar("TSource")
TTarget = TypeVar("TTarget")


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _normalize_float(value: float | Decimal | None) -> float | None:
    if value is None:
        return None
    return round(float(value), 2)


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.replace(tzinfo=None)
    return value


def _voucher_date_bounds(source_rows: list[object]) -> tuple[date | None, date | None]:
    """Min/max voucher dates present in the current Tally snapshot."""
    dates: list[date] = []
    for row in source_rows:
        voucher_date = _normalize_datetime(getattr(row, "voucher_date", None))
        if voucher_date is not None:
            dates.append(voucher_date.date())
    if not dates:
        return None, None
    return min(dates), max(dates)


def _is_within_tally_period(
    voucher_date: datetime | None,
    *,
    min_date: date | None,
    max_date: date | None,
) -> bool:
    """True when a stored row falls inside the Tally snapshot date window."""
    if min_date is None or max_date is None:
        return False
    normalized = _normalize_datetime(voucher_date)
    if normalized is None:
        return False
    row_date = normalized.date()
    return min_date <= row_date <= max_date


def _voucher_group_key(voucher_no: str | None, *, sync_key: str) -> str:
    """Group lines by voucher_no; blank voucher_no stays line-unique via sync_key."""
    normalized = _normalize_text(voucher_no)
    if normalized is None:
        return f"__line__:{sync_key}"
    return normalized.casefold()


@dataclass(frozen=True)
class _PurchaseSnapshot:
    voucher_no: str | None
    voucher_date: datetime | None
    ledger_name: str | None
    broker: str | None
    item_count: float | None
    itemno: float | None
    stock_item: str | None
    brand: str | None
    packing: float | None
    qty: float | None
    weight: float | None
    rate: float | None
    amount: float | None
    box: float | None
    qty_per_box: float | None

    @property
    def sync_key(self) -> str:
        return purchase_sync_key(
            voucher_no=self.voucher_no,
            voucher_date=self.voucher_date,
            ledger_name=self.ledger_name,
            itemno=self.itemno,
            stock_item=self.stock_item,
            brand=self.brand,
            packing=self.packing,
            qty=self.qty,
            weight=self.weight,
            rate=self.rate,
            amount=self.amount,
            broker=self.broker,
            box=self.box,
            qty_per_box=self.qty_per_box,
        )

    @property
    def voucher_group_key(self) -> str:
        return _voucher_group_key(self.voucher_no, sync_key=self.sync_key)

    @classmethod
    def from_tally(cls, row: TallyPurchase) -> _PurchaseSnapshot:
        return cls(
            voucher_no=_normalize_text(row.voucher_no),
            voucher_date=_normalize_datetime(row.voucher_date),
            ledger_name=_normalize_text(row.ledger_name),
            broker=_normalize_text(row.broker),
            item_count=_normalize_float(row.item_count),
            itemno=_normalize_float(row.itemno),
            stock_item=_normalize_text(row.stock_item),
            brand=_normalize_text(row.brand),
            packing=_normalize_float(row.packing),
            qty=_normalize_float(row.qty),
            weight=_normalize_float(row.weight),
            rate=_normalize_float(row.rate),
            amount=_normalize_float(row.amount),
            box=_normalize_float(row.box),
            qty_per_box=_normalize_float(row.qty_per_box),
        )

    @classmethod
    def from_yorapet(cls, row: YorapetPurchase) -> _PurchaseSnapshot:
        return cls(
            voucher_no=_normalize_text(row.voucher_no),
            voucher_date=_normalize_datetime(row.voucher_date),
            ledger_name=_normalize_text(row.ledger_name),
            broker=_normalize_text(row.broker),
            item_count=_normalize_float(row.item_count),
            itemno=_normalize_float(row.itemno),
            stock_item=_normalize_text(row.stock_item),
            brand=_normalize_text(row.brand),
            packing=_normalize_float(row.packing),
            qty=_normalize_float(row.qty),
            weight=_normalize_float(row.weight),
            rate=_normalize_float(row.rate),
            amount=_normalize_float(row.amount),
            box=_normalize_float(row.box),
            qty_per_box=_normalize_float(row.qty_per_box),
        )


@dataclass(frozen=True)
class _SaleSnapshot:
    voucher_no: str | None
    voucher_date: datetime | None
    ledger_name: str | None
    broker: str | None
    item_count: float | None
    item_no: float | None
    stock_item: str | None
    brand: str | None
    packing: float | None
    qty: float | None
    rate: float | None
    amount: float | None
    discount: float | None
    cartage: str | None

    @property
    def sync_key(self) -> str:
        return sale_sync_key(
            voucher_no=self.voucher_no,
            voucher_date=self.voucher_date,
            ledger_name=self.ledger_name,
            item_no=self.item_no,
            stock_item=self.stock_item,
            brand=self.brand,
            packing=self.packing,
            qty=self.qty,
            rate=self.rate,
            amount=self.amount,
            discount=self.discount,
            cartage=self.cartage,
            broker=self.broker,
        )

    @property
    def voucher_group_key(self) -> str:
        return _voucher_group_key(self.voucher_no, sync_key=self.sync_key)

    @classmethod
    def from_tally(cls, row: TallySale) -> _SaleSnapshot:
        return cls(
            voucher_no=_normalize_text(row.voucher_no),
            voucher_date=_normalize_datetime(row.voucher_date),
            ledger_name=_normalize_text(row.ledger_name),
            broker=_normalize_text(row.broker),
            item_count=_normalize_float(row.item_count),
            item_no=_normalize_float(row.item_no),
            stock_item=_normalize_text(row.stock_item),
            brand=_normalize_text(row.brand),
            packing=_normalize_float(row.packing),
            qty=_normalize_float(row.qty),
            rate=_normalize_float(row.rate),
            amount=_normalize_float(row.amount),
            discount=_normalize_float(row.discount),
            cartage=_normalize_text(row.cartage),
        )

    @classmethod
    def from_yorapet(cls, row: YorapetSale) -> _SaleSnapshot:
        return cls(
            voucher_no=_normalize_text(row.voucher_no),
            voucher_date=_normalize_datetime(row.voucher_date),
            ledger_name=_normalize_text(row.ledger_name),
            broker=_normalize_text(row.broker),
            item_count=_normalize_float(row.item_count),
            item_no=_normalize_float(row.item_no),
            stock_item=_normalize_text(row.stock_item),
            brand=_normalize_text(row.brand),
            packing=_normalize_float(row.packing),
            qty=_normalize_float(row.qty),
            rate=_normalize_float(row.rate),
            amount=_normalize_float(row.amount),
            discount=_normalize_float(row.discount),
            cartage=_normalize_text(row.cartage),
        )


def _apply_purchase_snapshot(
    target: YorapetPurchase,
    snapshot: _PurchaseSnapshot,
) -> None:
    target.sync_key = snapshot.sync_key
    target.voucher_no = snapshot.voucher_no
    target.voucher_date = snapshot.voucher_date
    target.ledger_name = snapshot.ledger_name
    target.broker = snapshot.broker
    target.item_count = snapshot.item_count
    target.itemno = snapshot.itemno
    target.stock_item = snapshot.stock_item
    target.brand = snapshot.brand
    target.packing = snapshot.packing
    target.qty = snapshot.qty
    target.weight = snapshot.weight
    target.rate = snapshot.rate
    target.amount = snapshot.amount
    target.box = snapshot.box
    target.qty_per_box = snapshot.qty_per_box
    cost_value, cost_price = apply_purchase_costing(
        amount=snapshot.amount,
        qty=snapshot.qty,
    )
    target.value_addition = None
    target.credit_note = None
    target.cost_value = cost_value
    target.cost_price = cost_price


def _apply_sale_snapshot(target: YorapetSale, snapshot: _SaleSnapshot) -> None:
    target.sync_key = snapshot.sync_key
    target.voucher_no = snapshot.voucher_no
    target.voucher_date = snapshot.voucher_date
    target.ledger_name = snapshot.ledger_name
    target.broker = snapshot.broker
    target.item_count = snapshot.item_count
    target.item_no = snapshot.item_no
    target.stock_item = snapshot.stock_item
    target.brand = snapshot.brand
    target.packing = snapshot.packing
    target.qty = snapshot.qty
    target.rate = snapshot.rate
    target.amount = snapshot.amount
    target.discount = snapshot.discount
    target.cartage = snapshot.cartage


def _label_singular(label: str) -> str:
    if label == "Purchases":
        return "purchase"
    if label == "Sales":
        return "sale"
    return label.lower()


def _step_summary(label: str, step: TallySyncStepResult) -> str:
    parts: list[str] = []
    if step.added:
        parts.append(f"{step.added} added")
    if step.updated:
        parts.append(f"{step.updated} updated")
    if step.removed:
        parts.append(f"{step.removed} removed")
    if step.unchanged:
        parts.append(f"{step.unchanged} unchanged")

    if not parts:
        return f"No {label.lower()} records found in Tally data."
    if step.added == step.source_count and step.updated == 0 and step.removed == 0:
        return f"Imported {step.added} {_label_singular(label)} line(s) from Tally."
    return f"{label}: {', '.join(parts)}"


class TallySyncService:
    """Compare legacy Tally tables and upsert into yorapet_* tables."""

    def __init__(
        self,
        tally_purchases: TallyPurchaseRepository,
        purchases: PurchaseRepository,
        tally_sales: TallySaleRepository,
        sales: SaleRepository,
    ) -> None:
        self._tally_purchases = tally_purchases
        self._purchases = purchases
        self._tally_sales = tally_sales
        self._sales = sales

    async def sync(self) -> TallySyncSessionResponse:
        started_at = datetime.now(UTC)
        purchase_step = await self._sync_purchase_step()
        sales_step = await self._sync_sales_step()
        completed_at = datetime.now(UTC)

        message = "; ".join(
            [
                _step_summary("Purchases", purchase_step),
                _step_summary("Sales", sales_step),
            ],
        )

        return TallySyncSessionResponse(
            started_at=started_at,
            completed_at=completed_at,
            steps=[purchase_step, sales_step],
            message=message,
        )

    async def _sync_purchase_step(self) -> TallySyncStepResult:
        return await self._sync_step(
            source_table="tallydata_purchases",
            target_table="yorapet_purchase",
            source_rows=await self._tally_purchases.list_all(),
            existing_rows=await self._purchases.list_all(),
            snapshot_from_source=_PurchaseSnapshot.from_tally,
            snapshot_from_target=_PurchaseSnapshot.from_yorapet,
            create_target=lambda sync_key: YorapetPurchase(sync_key=sync_key),
            apply_snapshot=_apply_purchase_snapshot,
            add_target=self._purchases.add,
            delete_by_sync_keys=self._purchases.delete_by_sync_keys,
        )

    async def _sync_sales_step(self) -> TallySyncStepResult:
        return await self._sync_step(
            source_table="tallydata_sales",
            target_table="yorapet_sales",
            source_rows=await self._tally_sales.list_all(),
            existing_rows=await self._sales.list_all(),
            snapshot_from_source=_SaleSnapshot.from_tally,
            snapshot_from_target=_SaleSnapshot.from_yorapet,
            create_target=lambda sync_key: YorapetSale(sync_key=sync_key),
            apply_snapshot=_apply_sale_snapshot,
            add_target=self._sales.add,
            delete_by_sync_keys=self._sales.delete_by_sync_keys,
        )

    async def _sync_step(
        self,
        *,
        source_table: str,
        target_table: str,
        source_rows: list[TSource],
        existing_rows: list[TTarget],
        snapshot_from_source,
        snapshot_from_target,
        create_target,
        apply_snapshot,
        add_target,
        delete_by_sync_keys,
    ) -> TallySyncStepResult:
        min_date, max_date = _voucher_date_bounds(source_rows)

        tally_by_voucher: dict[str, list] = defaultdict(list)
        for source_row in source_rows:
            snapshot = snapshot_from_source(source_row)
            tally_by_voucher[snapshot.voucher_group_key].append(snapshot)

        yorapet_by_voucher: dict[str, list] = defaultdict(list)
        for existing in existing_rows:
            if not _is_within_tally_period(
                getattr(existing, "voucher_date", None),
                min_date=min_date,
                max_date=max_date,
            ):
                continue
            snapshot = snapshot_from_target(existing)
            yorapet_by_voucher[snapshot.voucher_group_key].append(existing)

        tally_vouchers = set(tally_by_voucher)
        yorapet_vouchers = set(yorapet_by_voucher)

        vouchers_to_add = tally_vouchers - yorapet_vouchers
        vouchers_to_delete = yorapet_vouchers - tally_vouchers
        vouchers_to_update = tally_vouchers & yorapet_vouchers

        keys_to_delete: list[str] = []
        for voucher_key in vouchers_to_delete | vouchers_to_update:
            for row in yorapet_by_voucher[voucher_key]:
                keys_to_delete.append(row.sync_key)  # type: ignore[attr-defined]

        removed = await delete_by_sync_keys(keys_to_delete)

        added = 0
        updated_lines = 0

        for voucher_key in vouchers_to_add:
            for snapshot in tally_by_voucher[voucher_key]:
                target = create_target(snapshot.sync_key)
                apply_snapshot(target, snapshot)
                add_target(target)
                added += 1

        for voucher_key in vouchers_to_update:
            for snapshot in tally_by_voucher[voucher_key]:
                target = create_target(snapshot.sync_key)
                apply_snapshot(target, snapshot)
                add_target(target)
                updated_lines += 1

        removed_only = sum(
            len(yorapet_by_voucher[voucher_key]) for voucher_key in vouchers_to_delete
        )
        target_count_after = len(existing_rows) - removed + added + updated_lines

        return TallySyncStepResult(
            source_table=source_table,
            target_table=target_table,
            source_count=len(source_rows),
            target_count_before=len(existing_rows),
            target_count_after=target_count_after,
            added=added,
            updated=updated_lines,
            unchanged=0,
            removed=removed_only,
        )
