# YoraPet 2

Monorepo for the YoraPet inventory and reporting application.

| Layer | Stack |
|-------|-------|
| Backend | Python 3.13, FastAPI, SQLAlchemy 2 (async), Alembic, MySQL |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Mobile | Expo (React Native), TypeScript, TanStack Query |
| Package managers | **uv** (backend), **pnpm** (frontend), **npm** (mobile) |

## Repository layout

```text
yorapet2/
├── backend/          FastAPI API (/api/v1)
├── frontend/         React SPA (port 5173)
├── mobile/           Expo app (login + reports)
├── docker/           Production Compose stack (MySQL external)
├── Makefile          install, dev, lint, test, build, migrate, check
└── .cursor/rules/    Project conventions
```

## Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) (`pip install uv` or official installer)
- Node.js 20+
- [pnpm](https://pnpm.io/) 10+
- Docker (optional, for the `docker/` app stack — MySQL is managed separately)

## First-time setup

```bash
# 1. Install dependencies
make install

# 2. Configure secrets locally (never commit real credentials)
cp backend/.env backend/.env.local
# Edit backend/.env.local with MYSQL_* and JWT_SECRET_KEY

cp frontend/.env frontend/.env.local   # optional overrides

# 3. Run migrations
make migrate

# 4. Start dev servers (separate terminals)
make dev-backend    # http://127.0.0.1:8000
make dev-frontend   # http://localhost:5173
make dev-mobile     # Expo (optional)
```

Default admin (from env placeholders): username `admin` — change `ADMIN_PASSWORD` before shared use.

## Make targets

| Command | Description |
|---------|-------------|
| `make install` | `uv sync` + `pnpm install` + `npm install` (mobile) |
| `make dev-backend` | Uvicorn with reload on port **8000** |
| `make dev-frontend` | Vite dev server on port **5173** |
| `make dev-mobile` | Expo dev server |
| `make lint` | Ruff + oxlint + Prettier check |
| `make format` | Ruff format + Prettier write |
| `make typecheck` | mypy + `tsc` (frontend + mobile) |
| `make test` | pytest + vitest |
| `make build` | Production frontend build |
| `make migrate` | Alembic upgrade head |
| `make check` | lint + typecheck + test + build |

## Environment files

Committed `.env` / `.env.production` files contain **placeholders only**. Override locally with `.env.local` (gitignored).

### Backend (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `APP_ENV` | `development` or `production` — selects env file |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | Database connection |
| `MYSQL_DRIVER` | Async driver (`asyncmy`) |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `JWT_SECRET_KEY` | Signing key for access/refresh tokens |
| `AUTH_COOKIE_SECURE` | `true` in production (HTTPS) |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Bootstrap admin on first startup |

### Frontend (`frontend/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_APP_NAME` | Display name |
| `VITE_API_BASE_URL` | API prefix (`/api/v1` — proxied in dev) |
| `VITE_ENABLE_API_HEALTH_CHECK` | Optional health probe on load |

## Architecture

```text
Browser → React SPA → FastAPI /api/v1 → Services → Repositories → MySQL
                                              ↳ read-only tallydata_* (legacy)
                                              ↳ yorapet_* (application-owned)
```

- **Legacy `tallydata_*` tables** are read-only (maintained by external tallysync).
- **Application `yorapet_*` tables** are owned by this repo and managed via Alembic.
- JWT auth uses HttpOnly cookies; frontend uses credentialed Axios requests.

## Health endpoints

- `GET /api/v1/health/live` — process liveness
- `GET /api/v1/health/ready` — database connectivity

## Quality gates

`make test` runs unit tests only. Integration tests (`make test-backend-integration`) require a reachable MySQL database (configure `MYSQL_*` in `backend/.env` / `.env.local`).

Run before review:

```bash
make check
```

Backend mypy runs in strict mode; a small set of legacy service/repository modules is temporarily excluded in `pyproject.toml` until those modules are tightened incrementally.

Optional pre-commit hooks:

```bash
pip install pre-commit   # or: uv tool install pre-commit
pre-commit install
```

## Production notes

- Inject real secrets on the host; do not commit them.
- Set `APP_ENV=production` and use `backend/.env.production` as the template.
- Frontend build: `cd frontend && pnpm run build` — serve `dist/` behind HTTPS with `/api` proxied to uvicorn.
- Deployment host and CI provider are intentionally left open; `make check` remains portable.
