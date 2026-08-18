"""Purchase costing helpers and voucher-level cost recalculation."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.purchase import YorapetPurchase
from app.repositories.purchase_expense_repository import PurchaseExpenseRepository
from app.repositories.purchase_line_credit_repository import (
    PurchaseLineCreditRepository,
)
from app.repositories.purchase_repository import PurchaseRepository


def _dec(value: Decimal | float | int | None) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def compute_line_cost(
    *,
    amount: Decimal | float | int | None,
    qty: Decimal | float | int | None,
    value_addition: Decimal | float | int | None = None,
    credit_note: Decimal | float | int | None = None,
) -> tuple[Decimal, Decimal | None]:
    """Compute cost_value and cost_price from purchase line fields."""
    cost_value = (_dec(amount) + _dec(value_addition) - _dec(credit_note)).quantize(
        Decimal("0.01")
    )
    quantity = _dec(qty)
    if quantity == 0:
        return cost_value, None
    return cost_value, (cost_value / quantity).quantize(Decimal("0.01"))


def apply_purchase_costing(
    *,
    amount: Decimal | float | int | None,
    qty: Decimal | float | int | None,
) -> tuple[Decimal, Decimal | None]:
    """Baseline costing from Tally amount only (overlays applied later)."""
    return compute_line_cost(amount=amount, qty=qty)


def _line_id(line: YorapetPurchase) -> int:
    return int(line.id) if line.id is not None else id(line)


def _allocate_expenses_by_boxes(
    expenses: Decimal,
    lines: list[YorapetPurchase],
) -> dict[int, Decimal]:
    """value_addition = expenses / total_boxes * line.box."""
    boxes = {_line_id(line): abs(_dec(line.box)) for line in lines}
    total_boxes = sum(boxes.values(), Decimal("0"))
    if total_boxes == 0 or expenses == 0:
        return {line_id: Decimal("0") for line_id in boxes}

    shares: dict[int, Decimal] = {}
    allocated = Decimal("0")
    ordered = sorted(boxes.items(), key=lambda item: item[0])
    for index, (line_id, box_qty) in enumerate(ordered):
        if index == len(ordered) - 1:
            share = (expenses - allocated).quantize(Decimal("0.01"))
        else:
            share = (expenses * box_qty / total_boxes).quantize(Decimal("0.01"))
            allocated += share
        shares[line_id] = share
    return shares


def apply_overlays_to_lines(
    lines: list[YorapetPurchase],
    *,
    expenses: Decimal,
) -> None:
    """Mutate value_addition / cost_* using expenses + each line's credit_note."""
    if not lines:
        return
    value_additions = _allocate_expenses_by_boxes(_dec(expenses), lines)

    for line in lines:
        lid = _line_id(line)
        value_addition = value_additions.get(lid, Decimal("0"))
        credit = _dec(line.credit_note)
        cost_value, cost_price = compute_line_cost(
            amount=line.amount,
            qty=line.qty,
            value_addition=value_addition,
            credit_note=credit,
        )
        line.value_addition = value_addition
        line.cost_value = cost_value
        line.cost_price = cost_price


class PurchaseCostingService:
    """Load overlays and recalculate stored cost_* on purchase lines."""

    def __init__(self, session: AsyncSession) -> None:
        self._purchases = PurchaseRepository(session)
        self._expenses = PurchaseExpenseRepository(session)
        self._line_credits = PurchaseLineCreditRepository(session)

    async def restore_line_credits(self) -> int:
        """Copy persisted sync_key credits onto current purchase lines."""
        credits = {
            row.sync_key: _dec(row.credit_note)
            for row in await self._line_credits.list_all()
        }
        if not credits:
            return 0
        restored = 0
        for line in await self._purchases.list_all():
            amount = credits.get(line.sync_key)
            if amount is None:
                continue
            line.credit_note = amount.quantize(Decimal("0.01"))
            restored += 1
        return restored

    async def recalculate_voucher(
        self,
        voucher_no: str,
        voucher_date: datetime | None = None,
    ) -> int:
        """Recalculate cost fields for lines of one voucher (no + date)."""
        lines = await self._purchases.list_by_voucher(voucher_no, voucher_date)
        expense_row = await self._expenses.get_by_voucher(voucher_no, voucher_date)
        expenses = _dec(expense_row.expenses if expense_row else 0)
        apply_overlays_to_lines(lines, expenses=expenses)
        return len(lines)

    async def recalculate_all_with_overlays(self) -> int:
        """Recalculate every voucher that has expense/credit overlay data."""
        keys: set[tuple[str, datetime | None]] = set()
        for row in await self._expenses.list_all():
            keys.add((row.voucher_no.strip(), row.voucher_date))
        # Also recalc vouchers that only have line credits restored
        for line in await self._purchases.list_all():
            if _dec(line.credit_note) == 0:
                continue
            voucher_no = (line.voucher_no or "").strip()
            if voucher_no:
                keys.add((voucher_no, line.voucher_date))
        total = 0
        for voucher_no, voucher_date in sorted(
            keys,
            key=lambda item: (
                item[1] is None,
                item[1].timestamp() if item[1] is not None else 0.0,
                item[0].casefold(),
            ),
        ):
            if voucher_no:
                total += await self.recalculate_voucher(voucher_no, voucher_date)
        return total
