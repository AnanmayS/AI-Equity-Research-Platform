from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models.db_models import AgentRun, Market
from app.schemas.domain import AgentExplainRequest, AgentExplanation, PricingRequest, PricingResult
from app.services.ai_analysis_service import AIAnalysisService
from app.services.analysis_service import calculate_pricing
from app.services.market_repository import market_to_schema

router = APIRouter(tags=["analysis"])


@router.post("/pricing/run", response_model=PricingResult)
async def run_pricing(
    request: PricingRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> PricingResult:
    return await calculate_pricing(db, settings, request)


@router.get("/markets/{market_id}/analysis")
async def get_market_analysis(
    market_id: str,
    outcome: str | None = None,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    market = db.get(Market, market_id)
    if market is None:
        raise HTTPException(status_code=404, detail="Market not found")
    pricing = await calculate_pricing(db, settings, PricingRequest(market_id=market_id, outcome=outcome))
    explanation = await AIAnalysisService(settings).explain(market_to_schema(market), pricing)
    db.add(
        AgentRun(
            market_id=market_id,
            provider=explanation.provider,
            prompt="market analysis",
            response=explanation.text,
            metadata_json={"deterministic_only": explanation.deterministic_only},
        )
    )
    db.commit()
    return {"pricing": pricing, "explanation": explanation}


@router.post("/agent/explain", response_model=AgentExplanation)
async def explain_trade(
    request: AgentExplainRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AgentExplanation:
    market = db.get(Market, request.market_id)
    if market is None:
        raise HTTPException(status_code=404, detail="Market not found")
    pricing = await calculate_pricing(
        db, settings, PricingRequest(market_id=request.market_id, outcome=request.outcome)
    )
    explanation = await AIAnalysisService(settings).explain(market_to_schema(market), pricing)
    db.add(
        AgentRun(
            market_id=request.market_id,
            provider=explanation.provider,
            prompt="agent explain",
            response=explanation.text,
            metadata_json={"deterministic_only": explanation.deterministic_only},
        )
    )
    db.commit()
    return explanation
