.PHONY: install install-backend install-frontend install-mobile \
	dev dev-backend dev-frontend dev-mobile \
	emu-android-boot dev-mobile-android \
	lint lint-backend lint-frontend format format-backend \
	typecheck typecheck-backend typecheck-frontend typecheck-mobile \
	test test-backend test-frontend build build-frontend migrate migrate-up migrate-down \
	check db-up db-down

BACKEND_DIR := backend
FRONTEND_DIR := frontend
MOBILE_DIR := mobile
# When recipes cd into BACKEND_DIR, use the venv-local uv if present.
BACKEND_UV := $(if $(wildcard backend/.venv/bin/uv),.venv/bin/uv,uv)
PNPM := pnpm
NPM := npm
ANDROID_HOME ?= /opt/homebrew/share/android-commandlinetools
ANDROID_AVD ?= YoraPet_Pixel_API35

install: install-backend install-frontend install-mobile

install-backend:
	cd $(BACKEND_DIR) && $(BACKEND_UV) sync --all-groups

install-frontend:
	cd $(FRONTEND_DIR) && $(PNPM) install

install-mobile:
	cd $(MOBILE_DIR) && $(NPM) install

dev:
	@echo "Run servers in separate terminals:"
	@echo "  make dev-backend"
	@echo "  make dev-frontend"
	@echo "  make dev-mobile"

dev-backend:
	cd $(BACKEND_DIR) && APP_ENV=development $(BACKEND_UV) run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd $(FRONTEND_DIR) && $(PNPM) run dev

dev-mobile:
	cd $(MOBILE_DIR) && REACT_NATIVE_PACKAGER_HOSTNAME=$$(ipconfig getifaddr en0 2>/dev/null || echo 127.0.0.1) $(NPM) start

# Boot the local Android Virtual Device (requires Android SDK tools).
emu-android-boot:
	@test -x "$(ANDROID_HOME)/emulator/emulator" || (echo "Android emulator not found at $(ANDROID_HOME)"; exit 1)
	PATH="$(ANDROID_HOME)/emulator:$(ANDROID_HOME)/platform-tools:$$PATH" \
		$(ANDROID_HOME)/emulator/emulator -avd $(ANDROID_AVD) -netdelay none -netspeed full -no-metrics

# Expo against Android emulator (API via 10.0.2.2). Start backend + emu-android-boot first.
dev-mobile-android:
	cd $(MOBILE_DIR) && \
		cp -f .env.emulator .env && \
		REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 \
		ANDROID_HOME=$(ANDROID_HOME) \
		ANDROID_SDK_ROOT=$(ANDROID_HOME) \
		PATH="$(ANDROID_HOME)/platform-tools:$(ANDROID_HOME)/emulator:$$PATH" \
		$(NPM) run android

lint: lint-backend lint-frontend

lint-backend:
	cd $(BACKEND_DIR) && $(BACKEND_UV) run ruff check app tests
	cd $(BACKEND_DIR) && $(BACKEND_UV) run ruff format --check app tests

lint-frontend:
	cd $(FRONTEND_DIR) && $(PNPM) run lint
	cd $(FRONTEND_DIR) && $(PNPM) run format:check

format: format-backend format-frontend

format-backend:
	cd $(BACKEND_DIR) && $(BACKEND_UV) run ruff format app tests

format-frontend:
	cd $(FRONTEND_DIR) && $(PNPM) run format

typecheck: typecheck-backend typecheck-frontend typecheck-mobile

typecheck-backend:
	cd $(BACKEND_DIR) && $(BACKEND_UV) run mypy app

typecheck-frontend:
	cd $(FRONTEND_DIR) && $(PNPM) run typecheck

typecheck-mobile:
	cd $(MOBILE_DIR) && $(NPM) run typecheck

test: test-backend test-frontend

test-backend:
	cd $(BACKEND_DIR) && $(BACKEND_UV) run pytest tests/unit -q

test-backend-integration:
	cd $(BACKEND_DIR) && $(BACKEND_UV) run pytest tests/integration -q

test-frontend:
	cd $(FRONTEND_DIR) && $(PNPM) run test

build: build-frontend

build-frontend:
	cd $(FRONTEND_DIR) && $(PNPM) run build

migrate: migrate-up

migrate-up:
	cd $(BACKEND_DIR) && $(BACKEND_UV) run alembic upgrade head

migrate-down:
	cd $(BACKEND_DIR) && $(BACKEND_UV) run alembic downgrade -1

check: lint typecheck test build

db-up:
	docker compose up -d mysql

db-down:
	docker compose down
