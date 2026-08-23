"""Aggregate API v1 routers."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    company_profile,
    cost_centres,
    health,
    inventory_master,
    purchase_costing,
    purchases,
    sales,
    stock_summary,
    tally_data,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(company_profile.router)
api_router.include_router(health.router)
api_router.include_router(tally_data.router)
api_router.include_router(sales.router)
api_router.include_router(purchases.router)
api_router.include_router(purchase_costing.router)
api_router.include_router(stock_summary.router)
api_router.include_router(inventory_master.router)
api_router.include_router(cost_centres.router)
api_router.include_router(users.router)
