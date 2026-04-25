from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.db_models import AuditLog
from app.services.market_repository import upsert_market
from app.services.polymarket_client import PolymarketClient


async def sync_polymarket_markets(db: Session, settings: Settings, limit: int = 300) -> int:
    client = PolymarketClient(settings)
    markets = await client.fetch_public_markets(limit=limit)
    for market in markets:
        upsert_market(db, market)
    db.add(
        AuditLog(
            actor="sync",
            action="polymarket_sync",
            payload={"markets_seen": len(markets), "source": settings.polymarket_gamma_base_url},
        )
    )
    db.commit()
    return len(markets)

