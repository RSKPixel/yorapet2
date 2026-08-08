"""Ensure application-owned models use the yorapet_* table prefix."""

from __future__ import annotations

from app.db.alembic_utils import APPLICATION_TABLE_PREFIX
from app.models import (
    CompanyProfile,
    User,
    YorapetOpeningStock,
    YorapetPurchase,
    YorapetSale,
)


def test_application_models_use_yorapet_table_prefix() -> None:
    for model in (
        User,
        CompanyProfile,
        YorapetPurchase,
        YorapetSale,
        YorapetOpeningStock,
    ):
        assert model.__tablename__.startswith(APPLICATION_TABLE_PREFIX)
