.PHONY: help infra-up infra-down web-dev web-build web-lint web-test api-dev api-lint api-test prisma-validate

help:
	@echo "Available commands:"
	@echo "  make infra-up         # Start postgres/redis/(optional)minio"
	@echo "  make infra-down       # Stop local infrastructure"
	@echo "  make web-dev          # Run Next.js dev server"
	@echo "  make web-build        # Build Next.js app"
	@echo "  make web-lint         # Lint web app"
	@echo "  make web-test         # Run web tests (placeholder)"
	@echo "  make api-dev          # Run FastAPI in dev mode"
	@echo "  make api-lint         # Run ruff, black --check, mypy"
	@echo "  make api-test         # Run API tests"
	@echo "  make prisma-validate  # Placeholder for prisma validate"

infra-up:
	docker compose -f infra/docker-compose.yml up -d

infra-down:
	docker compose -f infra/docker-compose.yml down

web-dev:
	pnpm dev:web

web-build:
	pnpm build:web

web-lint:
	pnpm lint:web

web-test:
	pnpm test:web

api-dev:
	cd apps/api && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

api-lint:
	cd apps/api && ruff check . && black --check . && mypy app

api-test:
	cd apps/api && pytest

prisma-validate:
	@echo "Prisma schema not yet implemented. Add prisma/schema.prisma then run: pnpm prisma validate"
