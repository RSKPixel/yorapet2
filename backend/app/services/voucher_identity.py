"""Shared helpers for purchase voucher identity (no + date)."""

from __future__ import annotations

from datetime import date, datetime


def normalize_voucher_date(
    value: datetime | date | str | None,
) -> datetime | None:
    """Normalize voucher_date to naive datetime at midnight (date portion only)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return datetime(value.year, value.month, value.day)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day)
    text = str(value).strip()
    if not text:
        return None
    # Accept ISO date or datetime
    try:
        if "T" in text or " " in text:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
            return datetime(parsed.year, parsed.month, parsed.day)
        parsed_date = date.fromisoformat(text[:10])
        return datetime(parsed_date.year, parsed_date.month, parsed_date.day)
    except ValueError:
        return None


def voucher_dates_equal(
    left: datetime | date | str | None,
    right: datetime | date | str | None,
) -> bool:
    a = normalize_voucher_date(left)
    b = normalize_voucher_date(right)
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return a == b


def voucher_option_key(
    voucher_no: str, voucher_date: datetime | date | str | None
) -> str:
    date_part = ""
    normalized = normalize_voucher_date(voucher_date)
    if normalized is not None:
        date_part = normalized.date().isoformat()
    return f"{voucher_no.strip().casefold()}|{date_part}"
