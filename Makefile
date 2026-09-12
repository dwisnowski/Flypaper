.PHONY: install run run-api run-web build clean health scan-smoke aircraft-db lint

UV ?= uv
NPM ?= npm
API_HOST ?= 127.0.0.1
API_PORT ?= 8000

install:
	$(UV) sync
	cd frontend && $(NPM) install --legacy-peer-deps

run-api:
	$(UV) run uvicorn app.main:app --app-dir backend --reload --host $(API_HOST) --port $(API_PORT)

run-web:
	cd frontend && $(NPM) run dev -- --host

# Run API + Vite together (Ctrl-C stops both)
run:
	@echo "Starting Flypaper API (:$(API_PORT)) and Vite (:5173, LAN host)…"
	@$(MAKE) -j2 run-api run-web

build:
	cd frontend && $(NPM) run build
	@echo "Built frontend/dist — API will serve it when present."

health:
	curl -sf "http://$(API_HOST):$(API_PORT)/api/health" | python3 -m json.tool

scan-smoke: health
	@echo "Smoke OK — use the UI Scan sky button to spend credits."

aircraft-db:
	mkdir -p backend/data
	curl -L --progress-bar \
		"https://opensky-network.org/datasets/metadata/aircraftDatabase.csv" \
		-o backend/data/aircraftDatabase.csv
	@echo "Aircraft database saved. Restart the API to load it."

lint:
	$(UV) run ruff check backend
	cd frontend && $(NPM) run lint

clean:
	rm -rf .venv frontend/node_modules frontend/dist backend/data/aircraftDatabase.csv
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
