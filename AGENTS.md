# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Repository Structure

Four independent IBM API Connect sample APIs — each is a self-contained subdirectory with its own dependencies, Dockerfile, and deployment manifests:

| Dir | Stack | Port |
|-----|-------|------|
| `api1-library/` | Node.js 18 + Express 4, no auth | 3000 |
| `api2-salary/` | Python 3.11 + FastAPI + Keycloak JWKS (RS256) | 8001 |
| `api3-tours/` | Node.js 18 + Express 4, no auth | 3002 |
| `api4-graphql/` | Node.js 18 + Apollo Server v4 + Express | 4000 |

## Commands

All commands must be run from **inside the specific API subdirectory**, not the repo root.

### api1-library / api3-tours / api4-graphql (Node.js)
```bash
npm install && npm start      # run server
npm run dev                   # nodemon hot-reload
npm test                      # api3/api4 only — uses Node.js built-in test runner (node --test test/)
```

### api2-salary (Python/FastAPI)
```bash
cd api2-salary
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt pytest pytest-asyncio httpx
uvicorn app.main:app --reload --port 8001   # dev server

# Run all tests (from api2-salary/)
pytest tests/ -v --tb=short

# Run a single test file
pytest tests/test_security.py -v

# Run a single test
pytest tests/test_salary_routes.py::TestSalaryMeEndpoint::test_alice_can_view_own_salary -v

# Lint
pip install ruff
ruff check app/ && ruff format app/ --check
```

### OpenAPI Lint (repo root)
```bash
npm install -g @stoplight/spectral-cli
spectral lint api1-library/openapi.yaml --ruleset .spectral.yaml --fail-severity error
spectral lint api2-salary/openapi.yaml  --ruleset .spectral.yaml --fail-severity error
spectral lint api3-tours/openapi.yaml   --ruleset .spectral.yaml --fail-severity error
```

## Critical Patterns

### api2-salary — Test mocking
- Tests never hit a real Keycloak — they mock `app.auth.security.verify_keycloak_token` with an async function returning a fake payload dict directly.
- `conftest.py` sets env vars (`KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_AUDIENCE`) **before** importing `app.main` — this order is required because `security.py` reads env vars at import time.
- The session-scoped `TestClient` means `TestSalaryDeleteEndpoint` tests mutate shared in-memory state — delete tests must target records not used by other test classes.

### api2-salary — Data model
- `SALARIES[].employee_id` maps to Keycloak's `sub` claim (not a numeric ID); test fixture subs are `sub-alice-0001` etc.
- Role resolution merges `realm_access.roles` + `resource_access.<KEYCLOAK_AUDIENCE>.roles` — priority: `hr_system > manager > employee`.
- `TOKEN_HEADER_NAME` env var controls which header is read for Bearer token; defaults to `Authorization` but APIC may deliver via a custom header.

### api3-tours — Customer ID
- `/customers/:id` path param is the **emailAddress** (not a numeric/UUID ID) — this is non-obvious from REST conventions.

### api4-graphql — Schema location
- GraphQL SDL is read from disk at startup: `src/schema/schema.graphql`. Changes require server restart; no hot-reload of schema.
- Apollo Sandbox is always enabled (`introspection: true`) regardless of `NODE_ENV`.

### All Node.js APIs — Data store
- All data is in-memory; server restart resets to seed data. No database or persistence layer.

## Code Style

### Python (api2-salary)
- Linter: **Ruff** (check + format). Run `ruff check app/` and `ruff format app/ --check`.
- No type annotations on route handler arguments beyond FastAPI `Depends()` patterns; plain `dict` used for user/salary objects throughout.
- Permission helpers (`assert_can_*`) raise `HTTPException` directly — no return values, no custom exception classes.

### JavaScript (api1, api3, api4)
- CommonJS (`require`/`module.exports`) throughout — no ESM.
- Route files use `express.Router()` and are mounted in `src/index.js`.
- Error responses always include an `error` string key; 404s also echo back the problematic identifier.

### OpenAPI specs
- All `openapi.yaml` files must pass `.spectral.yaml` rules: every operation needs `operationId` (error) and `summary` (warn).
- `info-contact` and `info-license` are disabled in `.spectral.yaml` (sample APIs don't require them).
