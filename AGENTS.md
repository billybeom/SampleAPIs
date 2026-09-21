# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Repository Structure

Five independent IBM API Connect sample APIs — each is a self-contained subdirectory with its own dependencies, Dockerfile, and deployment manifests:

| Dir | Stack | Port |
|-----|-------|------|
| `api1-library/` | Node.js 18 + Express 4, no auth | 3000 |
| `api2-salary/` | Python 3.11 + FastAPI + Keycloak JWKS (RS256) | 8001 |
| `api3-tours/` | Node.js 18 + Express 4, no auth | 3002 |
| `api4-graphql/` | Node.js 18 + Apollo Server v4 + Express | 4000 |
| `api5-odata/` | Node.js 18 + Express 4 (OData 4.0), no auth | 3003 |

## Commands

All commands must be run from **inside the specific API subdirectory**, not the repo root.

### Node.js APIs (`api1-library`, `api3-tours`, `api4-graphql`, `api5-odata`)
```bash
npm install && npm start      # run server
npm run dev                   # nodemon hot-reload
npm test                      # api4 only — uses Node.js built-in test runner (node --test test/)
```

### Python/FastAPI (`api2-salary`)
```bash
cd api2-salary
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt pytest pytest-asyncio httpx
uvicorn app.main:app --reload --port 8001   # dev server

# Run all tests (from api2-salary/)
pytest tests/ -v --tb=short

# Run a single test file
pytest tests/test_security.py -v

# Run a single test method
pytest tests/test_salary_routes.py::TestSalaryMeEndpoint::test_alice_can_view_own_salary -v

# Lint & format
pip install ruff
ruff check app/ && ruff format app/ --check
```

### OpenAPI Lint (repo root)
```bash
spectral lint api1-library/openapi.yaml --ruleset .spectral.yaml --fail-severity error
spectral lint api2-salary/openapi.yaml  --ruleset .spectral.yaml --fail-severity error
spectral lint api3-tours/openapi.yaml   --ruleset .spectral.yaml --fail-severity error
spectral lint api5-odata/openapi.yaml   --ruleset .spectral.yaml --fail-severity error
```

## Critical Patterns & Non-Obvious Discoveries

### api2-salary (Python/FastAPI)
- **Import-time env vars**: `security.py` reads `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_AUDIENCE` at **import time**. When writing tests or scripts, set env vars (`os.environ.setdefault`) **before** importing `app.main`.
- **Test mocking**: Never hit Keycloak in tests. Mock `app.auth.security.verify_keycloak_token` with an `async def` function returning a fake payload dict.
- **In-memory state mutation**: `SALARIES` in `app/data/store.py` is a module-level mutable list. Tests using session-scoped `TestClient` mutate shared state across test methods; deletion tests must target records unused by other tests.
- **Identity & Roles**: `employee_id` maps to Keycloak's `sub` claim (e.g. `sub-alice-0001`), not numeric IDs. Role priority: `hr_system > manager > employee`.
- **Empty payload handling**: `salaries.py` uses `payload.model_dump(exclude_none=True)` — empty body `{}` must return 400 (`Bad Request`), not silently succeed.
- **Permission checks**: `assert_can_*` helpers raise `fastapi.HTTPException` directly — do not catch them in route handlers.

### api3-tours (Node.js/Express)
- **Customer ID param**: `/customers/:id` uses **`emailAddress`** as the key param, not an integer or UUID.

### api4-graphql (Node.js/Apollo Server)
- **Schema loading**: SDL is loaded from `src/schema/schema.graphql` via `fs.readFileSync` at startup. Schema edits require process restart (no hot-reload).
- **Introspection**: Apollo Sandbox is unconditionally enabled (`introspection: true`) regardless of `NODE_ENV`.

### api5-odata (Node.js/Express)
- **Route dual-matching**: Supports both OData canonical key syntax `GET /Products(1)` and REST style `GET /Products/1` via regex route paths `["/:key(\\d+)", "\\(:key(\\d+)\\)"]`.
- **Error structure**: OData errors use nested OData 4.0 JSON specification format: `{ error: { code, message, target } }`.

### All Node.js APIs
- **CommonJS only**: Use `require` / `module.exports` throughout (no ESM `import`/`export`).
- **In-memory store**: All data stores are purely in-memory structures reset on process restart.

### OpenAPI & Gateway Rules
- **Spectral enforcement**: Every operation across all `openapi.yaml` specs requires `operationId` (error) and `summary` (warn).
- **APIC Parameter Control**: For `api5-odata`, DataPower `invoke` policy must leave Parameter control without allowlist to pass OData system query options (`$filter`, `$select`, `$expand`, etc.) through.
