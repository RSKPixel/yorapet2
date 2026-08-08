"""FastAPI application factory."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.exception_handlers import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.db.session import create_engine, create_session_factory, dispose_engine
from app.middleware import RequestIdMiddleware, RequestLoggingMiddleware
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage application startup and shutdown resources."""
    settings: Settings = app.state.settings
    engine = create_engine(settings)
    session_factory = create_session_factory(engine)

    app.state.engine = engine
    app.state.session_factory = session_factory

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    (settings.upload_dir / "inventory").mkdir(parents=True, exist_ok=True)

    if settings.admin_username and settings.admin_password:
        async with session_factory() as session:
            created = await AuthService(UserRepository(session)).seed_admin(
                username=settings.admin_username,
                password=settings.admin_password,
                display_name=settings.admin_display_name,
            )
            await session.commit()
        if created:
            logger.info(
                "initial_admin_created username=%s",
                settings.admin_username,
            )

    logger.info(
        "application_started name=%s env=%s version=%s",
        settings.app_name,
        settings.app_env,
        settings.app_version,
    )
    try:
        yield
    finally:
        await dispose_engine(engine)
        logger.info("application_stopped")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and configure the FastAPI application."""
    resolved_settings = settings or get_settings()
    configure_logging(resolved_settings)

    app = FastAPI(
        title=resolved_settings.app_name,
        version=resolved_settings.app_version,
        debug=resolved_settings.debug,
        lifespan=lifespan,
    )
    app.state.settings = resolved_settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.cors_origin_list,
        allow_credentials=resolved_settings.cors_allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RequestIdMiddleware)

    register_exception_handlers(app)
    app.include_router(api_router, prefix=resolved_settings.api_v1_prefix)

    resolved_settings.upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/uploads",
        StaticFiles(directory=str(resolved_settings.upload_dir)),
        name="uploads",
    )

    return app


app = create_app()
