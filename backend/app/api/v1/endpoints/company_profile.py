"""Company profile API endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.dependencies.auth import CurrentAdminDep, CurrentUserDep
from app.dependencies.database import DbSessionDep
from app.repositories.company_profile_repository import CompanyProfileRepository
from app.schemas.company_profile import (
    CompanyProfileResponse,
    UpdateCompanyProfileRequest,
)
from app.services.company_profile_service import CompanyProfileService

router = APIRouter(prefix="/company-profile", tags=["company-profile"])


@router.get("", response_model=CompanyProfileResponse)
async def get_company_profile(
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> CompanyProfileResponse:
    """Return the company profile for authenticated users."""
    profile = await CompanyProfileService(
        CompanyProfileRepository(session),
    ).get_profile()
    return CompanyProfileResponse.model_validate(profile)


@router.patch("", response_model=CompanyProfileResponse)
async def update_company_profile(
    payload: UpdateCompanyProfileRequest,
    _admin: CurrentAdminDep,
    session: DbSessionDep,
) -> CompanyProfileResponse:
    """Update the company profile (admin only)."""
    profile = await CompanyProfileService(
        CompanyProfileRepository(session),
    ).update_profile(
        company_name=payload.company_name,
        address=payload.address,
        area=payload.area,
        city=payload.city,
        pin=payload.pin,
        email=payload.email,
        phone=payload.phone,
        gstin=payload.gstin,
    )
    return CompanyProfileResponse.model_validate(profile)
