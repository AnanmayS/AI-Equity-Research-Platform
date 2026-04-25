FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/apps/api:/app/apps/worker

COPY apps/api/pyproject.toml /app/apps/api/pyproject.toml
RUN pip install --no-cache-dir -e /app/apps/api

COPY apps/api /app/apps/api
COPY apps/worker /app/apps/worker

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/app/apps/api"]
