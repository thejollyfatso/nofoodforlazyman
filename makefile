.PHONY: install dev-client dev-server test lint format

install:
	cd client && npm install
	cd server && python -m venv .venv && .venv/bin/pip install -r ../requirements-dev.txt

dev-client:
	cd client && npm run dev

dev-server:
	cd server && ../.venv/bin/uvicorn main:app --reload --port 8000

test:
	cd client && npm test
	.venv/bin/pytest server/tests/

lint:
	cd client && npm run lint

format:
	cd client && npm run format
