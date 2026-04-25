# Worker

RQ worker entrypoints for scheduled sync and mark-to-market tasks.

Example enqueue from a shell:

```bash
python -c "from redis import Redis; from rq import Queue; from worker_app.jobs import sync_polymarket_markets; Queue('edge-jobs', connection=Redis.from_url('redis://localhost:6379/0')).enqueue(sync_polymarket_markets)"
```

Additional useful jobs:

- `auto_trade_same_day_markets`
- `settle_finished_positions`
- `mark_to_market_positions`
