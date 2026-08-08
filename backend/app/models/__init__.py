"""ORM models package.

Import application-owned models here so Alembic can discover metadata.
All application-owned tables use the yorapet_* prefix.
Legacy tallydata_* models must use LegacyBase and must not be imported
into Alembic's target metadata.
"""

from app.db.base import Base, LegacyBase
from app.models.company_profile import CompanyProfile
from app.models.inventory_extra import YorapetInventoryExtra
from app.models.inventory_image import YorapetInventoryImage
from app.models.opening_stock import YorapetOpeningStock
from app.models.purchase import YorapetPurchase
from app.models.purchase_credit_note import YorapetPurchaseCreditNote
from app.models.purchase_expense import YorapetPurchaseExpense
from app.models.purchase_line_credit import YorapetPurchaseLineCredit
from app.models.sale import YorapetSale
from app.models.user import User

__all__ = [
    "Base",
    "LegacyBase",
    "CompanyProfile",
    "User",
    "YorapetInventoryExtra",
    "YorapetInventoryImage",
    "YorapetOpeningStock",
    "YorapetPurchase",
    "YorapetPurchaseCreditNote",
    "YorapetPurchaseExpense",
    "YorapetPurchaseLineCredit",
    "YorapetSale",
]
