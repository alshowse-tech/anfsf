# ANFSF Docker Deployment Makefile
# Usage: make build / make deploy / make restart / make logs / make stop

.PHONY: build deploy deploy-pg restart restart-pg rollback stop stop-pg logs health clean pg-up pg-down pg-backup

# Load env from .env file
include .env

# Parameterized paths — override via environment or .env
PROJECT_ROOT ?= $(CURDIR)
HOST_DATA ?= $(PROJECT_ROOT)/.anfsf
HOST_OUTPUT ?= $(PROJECT_ROOT)/output
BACKUP_DIR ?= $(PROJECT_ROOT)/backups

IMAGE_BACKEND := anfsf
IMAGE_FRONTEND := anfsf-dashboard
PORT_BACKEND := 3000
PORT_FRONTEND := 8080

build:
	@echo "=== Building ANFSF backend ==="
	docker build -t $(IMAGE_BACKEND) .
	@echo "=== Building ANFSF frontend ==="
	docker build -t $(IMAGE_FRONTEND) -f Dockerfile.frontend .

# Deploy without PostgreSQL (SQLite backend)
deploy: stop build
	@echo "=== Ensuring directories and permissions ==="
	mkdir -p $(HOST_DATA) $(HOST_OUTPUT)
	chown -R 1001:1001 $(HOST_DATA) $(HOST_OUTPUT)
	@echo "=== Starting backend ($(PORT_BACKEND)) ==="
	docker run -d --name $(IMAGE_BACKEND) -p $(PORT_BACKEND):$(PORT_BACKEND) \
		-v $(HOST_DATA):/app/.anfsf \
		-v $(HOST_OUTPUT):/app/output \
		-e LLM_API_KEY=$(LLM_API_KEY) \
		-e ANFSF_MODEL=$(ANFSF_MODEL) \
		-e LLM_BASE_URL=$(LLM_BASE_URL) \
		-e ANFSF_ALLOWED_ORIGINS=$(ANFSF_ALLOWED_ORIGINS) \
		$(IMAGE_BACKEND)
	@echo "=== Starting frontend ($(PORT_FRONTEND)) ==="
	docker run -d --name $(IMAGE_FRONTEND) -p $(PORT_FRONTEND):80 $(IMAGE_FRONTEND)
	@echo "=== Waiting for healthcheck ==="
	@sleep 10
	@make health

# Deploy with PostgreSQL via docker-compose
deploy-pg: stop-pg
	docker compose up -d --build
	@sleep 10
	@make health

restart: stop
	@mkdir -p $(HOST_DATA) $(HOST_OUTPUT)
	@chown -R 1001:1001 $(HOST_DATA) $(HOST_OUTPUT)
	docker run -d --name $(IMAGE_BACKEND) -p $(PORT_BACKEND):$(PORT_BACKEND) \
		-v $(HOST_DATA):/app/.anfsf \
		-v $(HOST_OUTPUT):/app/output \
		-e LLM_API_KEY=$(LLM_API_KEY) \
		-e ANFSF_MODEL=$(ANFSF_MODEL) \
		-e LLM_BASE_URL=$(LLM_BASE_URL) \
		-e ANFSF_ALLOWED_ORIGINS=$(ANFSF_ALLOWED_ORIGINS) \
		$(IMAGE_BACKEND)
	docker run -d --name $(IMAGE_FRONTEND) -p $(PORT_FRONTEND):80 $(IMAGE_FRONTEND)
	@sleep 5
	@make health

restart-pg: stop
	@echo "=== Restarting full stack ==="
	docker compose restart
	@sleep 5
	@make health

rollback: stop
	@echo "=== Deploying previous version ==="
	docker run -d --name $(IMAGE_BACKEND) -p $(PORT_BACKEND):$(PORT_BACKEND) \
		-v $(HOST_DATA):/app/.anfsf \
		-v $(HOST_OUTPUT):/app/output \
		-e LLM_API_KEY=$(LLM_API_KEY) \
		-e ANFSF_MODEL=$(ANFSF_MODEL) \
		-e LLM_BASE_URL=$(LLM_BASE_URL) \
		-e ANFSF_ALLOWED_ORIGINS=$(ANFSF_ALLOWED_ORIGINS) \
		$(IMAGE_BACKEND):previous
	docker run -d --name $(IMAGE_FRONTEND) -p $(PORT_FRONTEND):80 $(IMAGE_FRONTEND):previous
	@sleep 5
	@make health

stop:
	@echo "=== Stopping containers ==="
	docker rm -f $(IMAGE_BACKEND) $(IMAGE_FRONTEND) 2>/dev/null || true

stop-pg:
	@echo "=== Stopping full stack ==="
	docker compose down

logs:
	docker logs $(IMAGE_BACKEND) 2>&1 | tail -50
	@echo "--- frontend ---"
	docker logs $(IMAGE_FRONTEND) 2>&1 | tail -20

logs-follow:
	docker logs -f $(IMAGE_BACKEND)

health:
	@echo "=== Container Status ==="
	docker ps --filter "name=anfsf" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "=== Backend Health ==="
	curl -s http://localhost:$(PORT_BACKEND)/health | python3 -m json.tool
	@echo ""
	@echo "=== Backend Readiness ==="
	curl -s http://localhost:$(PORT_BACKEND)/ready | python3 -m json.tool
	@echo ""
	@echo "=== Frontend ==="
	curl -s -o /dev/null -w "HTTP %{http_code} - http://localhost:$(PORT_FRONTEND)\n" http://localhost:$(PORT_FRONTEND)/

clean: stop
	@echo "=== Removing images ==="
	docker rmi $(IMAGE_BACKEND) $(IMAGE_FRONTEND) 2>/dev/null || true
	@echo "=== Done ==="

# PostgreSQL helpers
pg-up:
	@echo "=== Starting PostgreSQL only ==="
	docker compose up -d postgres
	@sleep 5
	docker exec anfsf-postgres pg_isready -U anfsf

pg-down:
	@echo "=== Stopping PostgreSQL ==="
	docker compose down postgres

pg-backup:
	@echo "=== Backing up PostgreSQL ==="
	bash scripts/backup.sh postgres
