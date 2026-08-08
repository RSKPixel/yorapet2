"""Company profile business logic."""

from __future__ import annotations

from app.models.company_profile import CompanyProfile
from app.repositories.company_profile_repository import CompanyProfileRepository


class CompanyProfileService:
    """Manage the singleton company profile record."""

    def __init__(self, company_profiles: CompanyProfileRepository) -> None:
        self._company_profiles = company_profiles

    async def get_profile(self) -> CompanyProfile:
        return await self._company_profiles.get_or_create()

    async def update_profile(
        self,
        *,
        company_name: str,
        address: str,
        area: str,
        city: str,
        pin: str,
        email: str,
        phone: str,
        gstin: str,
    ) -> CompanyProfile:
        profile = await self._company_profiles.get_or_create()
        return await self._company_profiles.update(
            profile,
            company_name=company_name,
            address=address,
            area=area,
            city=city,
            pin=pin,
            email=email,
            phone=phone,
            gstin=gstin,
        )
