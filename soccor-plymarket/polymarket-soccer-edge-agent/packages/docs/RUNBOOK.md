# Runbook

## Local Demo

1. Copy `.env.example` to `.env`.
2. Keep `APP_MODE=demo` and `AI_ENABLED=false`.
3. Start the stack with `docker compose up --build`.
4. Open `http://localhost:3000`.

## Sync Public Markets

Call:

```bash
curl -X POST http://localhost:8000/sync/polymarket
```

The sync uses public Polymarket APIs only and normalizes soccer-like markets into the internal model.

## No-AI Mode

Set:

```env
AI_ENABLED=false
LLM_PROVIDER=disabled
```

The API still returns deterministic summaries from pricing outputs.

## Paper Trade Rejection Debugging

Check:

```bash
curl http://localhost:8000/risk/status
curl http://localhost:8000/audit
```

Common causes are wide spread, low liquidity, unsupported league, missing team metadata, near kickoff, or stake/exposure limits.

