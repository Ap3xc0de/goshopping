-include .env
export

.PHONY: dev dev-lan dev-all-lan stop-lan dev-core dev-integrations dev-superadmin dev-admin dev-ai dev-storefront migrate migrate-down build-core build-integrations build-superadmin build-admin test-core test-ai clean tf-init-dev tf-init-staging tf-init-production tf-check

# ── Development ──
dev:
	docker compose -f docker/docker-compose.yml up -d
	@echo "PostgreSQL running on localhost:5434"
	@echo "Redis running on localhost:6379"
	@echo "ElasticMQ running on localhost:9324"

dev-all-lan:
	powershell -ExecutionPolicy Bypass -File scripts/dev-all-lan.ps1

dev-lan: dev-all-lan

stop-lan:
	powershell -ExecutionPolicy Bypass -File scripts/stop-lan.ps1

dev-core:
	cd apps/core && go run cmd/server/main.go

test-core:
	cd apps/core && \
	  DB_HOST=127.0.0.1 DB_PORT=5434 DB_USER=goshopping DB_PASSWORD=localdev123 \
	  DB_NAME=goshopping DB_SSL_MODE=disable \
	  JWT_SECRET=test-secret-for-goshopping-tests APP_ENV=development \
	  go test ./internal/... -timeout 120s

test-ai:
	cd apps/ai-engine && npm test

dev-integrations:
	cd apps/integrations && PORT=3001 npm run start:dev

dev-superadmin:
	cd apps/superadmin && npm run dev

dev-admin:
	cd apps/admin && npm run dev

dev-ai:
	cd apps/ai-engine && npm run dev

dev-storefront:
	cd apps/storefront && npm run dev

# ── Database ──
migrate:
	cd apps/core && go run cmd/server/main.go migrate

migrate-down:
	@echo "Run: docker exec -it <postgres-container> psql -U goshopping -f /migrations/001_initial_schema.down.sql"

migrate-create:
	@read -p "Migration name: " name; \
	cd apps/core && migrate create -ext sql -dir migrations -seq $$name

# ── Build ──
build-core:
	cd apps/core && CGO_ENABLED=0 GOOS=linux go build -o bin/server cmd/server/main.go

build-integrations:
	cd apps/integrations && npm run build

build-superadmin:
	cd apps/superadmin && npm run build

build-admin:
	cd apps/admin && npm run build

# ── Clean ──
clean:
	docker compose -f docker/docker-compose.yml down -v

# ── Deploy DEV ──
deploy-dev:
	@bash scripts/deploy-dev.sh

destroy-dev:
	@bash scripts/destroy-dev.sh

check-dev:
	@bash scripts/check-health.sh

ssh-dev:
	@cd infra/environments/dev && terraform output -raw ssh_command | bash

# ── Terraform (root modules only — never init under infra/modules/) ──
tf-init-dev:
	cd infra/environments/dev && terraform init

tf-init-staging:
	cd infra/environments/staging && terraform init

tf-init-production:
	cd infra/environments/production && terraform init

# Fails if someone ran `terraform init` inside reusable modules (duplicates ~850MB AWS provider each).
tf-check:
	@if find infra/modules -type d -name '.terraform' | grep -q .; then \
		echo "ERROR: .terraform found under infra/modules — only run init in infra/environments/<env>"; \
		find infra/modules -type d -name '.terraform'; \
		exit 1; \
	fi
	@echo "OK: no .terraform under infra/modules"
