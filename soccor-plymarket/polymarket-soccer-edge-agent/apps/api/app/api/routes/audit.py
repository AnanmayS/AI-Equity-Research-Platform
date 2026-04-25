from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.db_models import AgentRun, AuditLog, Market, PaperSettlement, PricingRun, RiskEvent

router = APIRouter(tags=["audit"])


@router.get("/audit")
def audit_log(db: Session = Depends(get_db)) -> dict:
    audits = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(50)).all()
    pricing = db.scalars(select(PricingRun).order_by(PricingRun.created_at.desc()).limit(20)).all()
    agents = db.scalars(select(AgentRun).order_by(AgentRun.created_at.desc()).limit(20)).all()
    risks = db.scalars(select(RiskEvent).order_by(RiskEvent.created_at.desc()).limit(20)).all()
    settlements = db.scalars(
        select(PaperSettlement).order_by(PaperSettlement.settled_at.desc()).limit(20)
    ).all()
    market_ids = {
        market_id
        for market_id in [*(row.market_id for row in audits), *(row.market_id for row in agents), *(row.market_id for row in settlements)]
        if market_id
    }
    market_labels = {
        row.market_id: row.question
        for row in db.scalars(select(Market).where(Market.market_id.in_(market_ids))).all()
    }
    return {
        "audit_logs": [
            {
                "id": row.id,
                "actor": row.actor,
                "action": row.action,
                "market_id": row.market_id,
                "market_label": market_labels.get(row.market_id) if row.market_id else None,
                "payload": row.payload,
                "created_at": row.created_at.isoformat(),
            }
            for row in audits
        ],
        "pricing_runs": [
            {
                "id": row.id,
                "market_id": row.market_id,
                "fair_probability": row.fair_probability,
                "raw_edge": row.raw_edge,
                "confidence": row.confidence,
                "created_at": row.created_at.isoformat(),
            }
            for row in pricing
        ],
        "agent_runs": [
            {
                "id": row.id,
                "market_id": row.market_id,
                "market_label": market_labels.get(row.market_id) if row.market_id else None,
                "provider": row.provider,
                "response": row.response,
                "created_at": row.created_at.isoformat(),
            }
            for row in agents
        ],
        "risk_events": [
            {
                "id": row.id,
                "market_id": row.market_id,
                "severity": row.severity,
                "message": row.message,
                "created_at": row.created_at.isoformat(),
            }
            for row in risks
        ],
        "settlements": [
            {
                "id": row.id,
                "market_id": row.market_id,
                "market_label": market_labels.get(row.market_id),
                "outcome": row.outcome,
                "settlement_result": row.settlement_result,
                "settlement_price": row.settlement_price,
                "realized_pnl": row.realized_pnl,
                "home_score": row.home_score,
                "away_score": row.away_score,
                "settled_at": row.settled_at.isoformat(),
            }
            for row in settlements
        ],
    }
