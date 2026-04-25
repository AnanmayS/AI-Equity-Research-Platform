from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.db_models import AuditLog, Market, PricingRun
from app.schemas.domain import PricingRequest, PricingResult
from app.services.market_repository import market_to_schema
from app.services.pricing_engine import PricingEngine
from app.services.soccer_data_client import build_soccer_client


async def calculate_pricing(
    db: Session,
    settings: Settings,
    request: PricingRequest,
) -> PricingResult:
    market = db.get(Market, request.market_id)
    if market is None:
        raise HTTPException(status_code=404, detail="Market not found")
    if not market.home_team or not market.away_team:
        raise HTTPException(status_code=422, detail="Market is missing normalized team names")
    soccer = build_soccer_client(settings)
    home = await soccer.fetch_team_context(market.home_team, market.league)
    away = await soccer.fetch_team_context(market.away_team, market.league)
    result = PricingEngine().price_market(market_to_schema(market), home, away, request.outcome)
    result_json = result.model_dump(mode="json")
    db.add(
        PricingRun(
            market_id=market.market_id,
            market_type=result.market_type,
            fair_probability=result.fair_probability,
            market_probability=result.market_implied_probability,
            raw_edge=result.raw_edge,
            confidence=result.confidence,
            inputs=result_json["inputs"],
            output=result_json,
        )
    )
    db.add(
        AuditLog(
            actor="pricing_engine",
            action="pricing_run",
            market_id=market.market_id,
            payload=result_json,
        )
    )
    db.commit()
    return result
