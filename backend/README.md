# YoraPet Backend

FastAPI application. See the [root README](../README.md) for setup.

```bash
uv sync --all-groups
APP_ENV=development uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
uv run alembic upgrade head
uv run pytest
```

Dependencies are defined in `pyproject.toml` / `uv.lock`. `requirements.txt` is exported for compatibility.

## Auth

- **Web:** HTTP-only cookies (`delivery` defaults to `cookie` on login).
- **Mobile:** send `"delivery": "bearer"` on `POST /auth/login`; tokens are returned in the JSON body. Send `Authorization: Bearer <token>` on subsequent requests (access for APIs, refresh for `/auth/refresh` and `/auth/logout`).
