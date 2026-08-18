"""Alembic include_object safety tests."""

from __future__ import annotations

from app.db.alembic_utils import include_object


def test_include_object_excludes_tallydata_tables() -> None:
    assert include_object(None, "tallydata_ledgers", "table", True, None) is False
    assert include_object(None, "TallyData_Vouchers", "table", True, None) is False


def test_include_object_allows_application_tables() -> None:
    assert include_object(None, "yorapet_users", "table", False, None) is True
    assert (
        include_object(None, "yorapet_company_profiles", "table", False, None) is True
    )
