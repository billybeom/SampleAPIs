# ── Stage 1: dependency install ───────────────────────────────────────────────
FROM python:3.11-slim AS deps
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime
WORKDIR /app

# Run as non-root (required for OpenShift arbitrary-UID policy)
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

COPY --from=deps /install /usr/local
COPY --chown=appuser:appgroup app/ ./app/

EXPOSE 8000
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
