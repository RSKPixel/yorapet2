"""Application-specific exceptions and error contracts."""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base application error with a stable client-facing contract."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "app_error",
        status_code: int = 400,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}


class NotFoundError(AppError):
    """Raised when a requested resource does not exist."""

    def __init__(self, message: str = "Resource not found", **kwargs: Any) -> None:
        super().__init__(message, code="not_found", status_code=404, **kwargs)


class ConflictError(AppError):
    """Raised when a request conflicts with current state."""

    def __init__(self, message: str = "Conflict", **kwargs: Any) -> None:
        super().__init__(message, code="conflict", status_code=409, **kwargs)


class AuthenticationError(AppError):
    """Raised when authentication is missing or invalid."""

    def __init__(
        self,
        message: str = "Authentication required",
        **kwargs: Any,
    ) -> None:
        super().__init__(
            message,
            code="authentication_required",
            status_code=401,
            **kwargs,
        )


class AuthorizationError(AppError):
    """Raised when the authenticated user lacks permission."""

    def __init__(
        self,
        message: str = "Forbidden",
        **kwargs: Any,
    ) -> None:
        super().__init__(
            message,
            code="forbidden",
            status_code=403,
            **kwargs,
        )
