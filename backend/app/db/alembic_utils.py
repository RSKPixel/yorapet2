"""Helpers shared by Alembic configuration and tests."""

from __future__ import annotations

import re
from typing import Any

LEGACY_TABLE_PREFIX = "tallydata_"
LEGACY_TABLE_PATTERN = re.compile(rf"^{re.escape(LEGACY_TABLE_PREFIX)}", re.IGNORECASE)
APPLICATION_TABLE_PREFIX = "yorapet_"
APPLICATION_TABLE_PATTERN = re.compile(
    rf"^{re.escape(APPLICATION_TABLE_PREFIX)}",
    re.IGNORECASE,
)


def include_object(
    object_: Any,
    name: str | None,
    type_: str,
    reflected: bool,
    compare_to: Any,
) -> bool:
    """Exclude legacy tallydata_* tables from Alembic autogenerate."""
    del reflected, compare_to

    if type_ == "table" and name and LEGACY_TABLE_PATTERN.match(name):
        return False

    if type_ in {"index", "column", "unique_constraint", "foreign_key_constraint"}:
        table = getattr(object_, "table", None)
        table_name = getattr(table, "name", None)
        if table_name and LEGACY_TABLE_PATTERN.match(table_name):
            return False

    return True
