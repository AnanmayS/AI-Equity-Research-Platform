from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.db_models import Market
from app.schemas.domain import NormalizedMarket


def market_to_schema(market: Market) -> NormalizedMarket:
    return NormalizedMarket(
        market_id=market.market_id,
        event_id=market.event_id,
        slug=market.slug,
        question=market.question,
        description=market.description,
        sport=market.sport,
        league=market.league,
        home_team=market.home_team,
        away_team=market.away_team,
        start_time=market.start_time,
        market_type=market.market_type,  # type: ignore[arg-type]
        line=market.line,
        side_labels=market.side_labels or [],
        token_ids=market.token_ids or [],
        best_bid=market.best_bid,
        best_ask=market.best_ask,
        midpoint=market.midpoint,
        spread=market.spread,
        volume=market.volume,
        liquidity=market.liquidity,
        liquidity_score=market.liquidity_score,
        status=market.status,
        raw=market.raw or {},
    )


def upsert_market(db: Session, normalized: NormalizedMarket) -> Market:
    market = db.get(Market, normalized.market_id)
    values = normalized.model_dump()
    if market is None:
        market = Market(**values)
        db.add(market)
    else:
        for key, value in values.items():
            setattr(market, key, value)
    return market


def list_markets(
    db: Session,
    league: str | None = None,
    market_type: str | None = None,
    min_liquidity: float | None = None,
    max_spread: float | None = None,
    limit: int = 50,
) -> list[Market]:
    stmt = select(Market).where(Market.sport == "soccer").order_by(Market.start_time.asc()).limit(limit)
    stmt = stmt.where(Market.start_time >= datetime.now(UTC) - timedelta(hours=4))
    if league:
        stmt = stmt.where(Market.league == league)
    if market_type:
        stmt = stmt.where(Market.market_type == market_type)
    if min_liquidity is not None:
        stmt = stmt.where(Market.liquidity >= min_liquidity)
    if max_spread is not None:
        stmt = stmt.where(Market.spread <= max_spread)
    return list(db.scalars(stmt).all())

