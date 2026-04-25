from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models.db_models import Market, MarketSnapshot
from app.schemas.domain import NormalizedMarket, OrderBookSnapshot
from app.services.market_repository import list_markets, market_to_schema
from app.services.polymarket_client import PolymarketClient

router = APIRouter(tags=["markets"])


@router.get("/markets", response_model=list[NormalizedMarket])
def get_markets(
    league: str | None = None,
    market_type: str | None = None,
    min_liquidity: float | None = Query(default=None, ge=0),
    max_spread: float | None = Query(default=None, ge=0, le=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[NormalizedMarket]:
    return [
        market_to_schema(market)
        for market in list_markets(db, league, market_type, min_liquidity, max_spread, limit)
    ]


@router.get("/markets/{market_id}", response_model=NormalizedMarket)
def get_market(market_id: str, db: Session = Depends(get_db)) -> NormalizedMarket:
    market = db.get(Market, market_id)
    if market is None:
        raise HTTPException(status_code=404, detail="Market not found")
    return market_to_schema(market)


@router.get("/markets/{market_id}/orderbook", response_model=OrderBookSnapshot)
async def get_orderbook(
    market_id: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> OrderBookSnapshot:
    market = db.get(Market, market_id)
    if market is None:
        raise HTTPException(status_code=404, detail="Market not found")
    if market.raw and market.raw.get("demo"):
        snapshot = OrderBookSnapshot(
            market_id=market.market_id,
            token_id=(market.token_ids or [None])[0],
            bids=[
                {"price": market.best_bid or 0.5, "size": 800},
                {"price": round((market.best_bid or 0.5) - 0.02, 2), "size": 1200},
            ],
            asks=[
                {"price": market.best_ask or 0.55, "size": 900},
                {"price": round((market.best_ask or 0.55) + 0.02, 2), "size": 1100},
            ],
            best_bid=market.best_bid,
            best_ask=market.best_ask,
            midpoint=market.midpoint,
            spread=market.spread,
            captured_at=datetime.now(UTC),
            raw={"demo": True},
        )
    else:
        client = PolymarketClient(settings)
        snapshot = await client.fetch_orderbook_snapshot(market.market_id, (market.token_ids or [None])[0])
    db.add(
        MarketSnapshot(
            market_id=market.market_id,
            best_bid=snapshot.best_bid,
            best_ask=snapshot.best_ask,
            midpoint=snapshot.midpoint,
            spread=snapshot.spread,
            orderbook=snapshot.model_dump(mode="json"),
        )
    )
    if snapshot.best_bid is not None:
        market.best_bid = snapshot.best_bid
    if snapshot.best_ask is not None:
        market.best_ask = snapshot.best_ask
    market.midpoint = snapshot.midpoint
    market.spread = snapshot.spread
    db.commit()
    return snapshot
