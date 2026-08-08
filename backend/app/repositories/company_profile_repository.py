"""Database operations for company profile settings."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company_profile import CompanyProfile


class CompanyProfileRepository:
    """SQLAlchemy persistence for the singleton company profile."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self) -> CompanyProfile | None:
        result = await self._session.execute(
            select(CompanyProfile).order_by(CompanyProfile.id.asc()).limit(1),
        )
        return result.scalar_one_or_none()

    async def get_or_create(self) -> CompanyProfile:
        profile = await self.get()
        if profile is not None:
            return profile

        profile = CompanyProfile()
        self._session.add(profile)
        await self._session.flush()
        await self._session.commit()
        await self._session.refresh(profile)
        return profile

    async def update(
        self,
        profile: CompanyProfile,
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
        profile.company_name = company_name
        profile.address = address
        profile.area = area
        profile.city = city
        profile.pin = pin
        profile.email = email
        profile.phone = phone
        profile.gstin = gstin
        await self._session.flush()
        await self._session.commit()
        await self._session.refresh(profile)
        return profile
