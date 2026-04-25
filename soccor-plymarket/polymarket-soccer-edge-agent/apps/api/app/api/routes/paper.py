from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models.db_models import AppSetting, Market, PaperOrder, PaperPosition, PaperSettlement
from app.schemas.domain import (
    AutoPaperTradeRequest,
    AutoPaperTradeRunResult,
    PaperTradeRequest,
    PaperTradeResult,
    PaperSettlementView,
    PositionView,
    PortfolioSummary,
    RiskValidationRequest,
    RiskValidationResult,
    SettlementRunResult,
)
from app.services.auto_paper_trader import AutoPaperTrader
from app.services.paper_trading_engine import PaperTradingEngine
from app.services.risk_engine import RiskEngine
from app.services.settlement_service import SettlementService

router = APIRouter(tags=["paper"])


@router.post("/paper-trades", response_model=PaperTradeResult)
def place_paper_trade(
    request: PaperTradeRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> PaperTradeResult:
    if request.source != "auto":
        raise HTTPException(
            status_code=403,
            detail="Manual paper trades are disabled. This app runs in automatic paper-trading mode only.",
        )
    market = db.get(Market, request.market_id)
    if market is None:
        raise HTTPException(status_code=404, detail="Market not found")
    validation = RiskEngine(settings).validate(db, market, request)
    if not validation.allowed:
        raise HTTPException(status_code=422, detail=validation.model_dump())
    return PaperTradingEngine().place_trade(db, market, request)


@router.get("/paper-trades")
def list_paper_trades(db: Session = Depends(get_db)) -> list[dict]:
    orders = db.scalars(select(PaperOrder).order_by(PaperOrder.created_at.desc()).limit(100)).all()
    return [
        {
            "id": order.id,
            "market_id": order.market_id,
            "side": order.side,
            "outcome": order.outcome,
            "quantity": order.quantity,
            "limit_price": order.limit_price,
            "fill_mode": order.fill_mode,
            "source": order.source,
            "strategy_tag": order.strategy_tag,
            "status": order.status,
            "reason": order.reason,
            "created_at": order.created_at.isoformat(),
        }
        for order in orders
    ]


@router.post("/paper-trades/validate", response_model=RiskValidationResult)
def validate_paper_trade(
    request: RiskValidationRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RiskValidationResult:
    raise HTTPException(
        status_code=403,
        detail="Manual validation is disabled in automatic paper-trading mode.",
    )


@router.get("/positions", response_model=list[PositionView])
def positions(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> list[PositionView]:
    SettlementService().settle_ended_positions(db, settings)
    PaperTradingEngine().mark_to_market(db)
    rows = db.scalars(select(PaperPosition).order_by(PaperPosition.updated_at.desc())).all()
    return [
        PositionView(
            id=row.id,
            market_id=row.market_id,
            outcome=row.outcome,
            quantity=row.quantity,
            avg_price=row.avg_price,
            realized_pnl=row.realized_pnl,
            unrealized_pnl=row.unrealized_pnl,
            source=row.source,
            opened_at=row.opened_at,
            settled_at=row.settled_at,
            settlement_result=row.settlement_result,
            settlement_price=row.settlement_price,
            status=row.status,
        )
        for row in rows
    ]


@router.get("/portfolio/summary", response_model=PortfolioSummary)
def portfolio_summary(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> PortfolioSummary:
    SettlementService().settle_ended_positions(db, settings)
    PaperTradingEngine().mark_to_market(db)
    positions = db.scalars(select(PaperPosition)).all()
    settlements = db.scalars(select(PaperSettlement).order_by(PaperSettlement.settled_at.asc())).all()
    setting_row = db.get(AppSetting, "ui")
    paper_defaults = setting_row.value.get("paper_defaults", {}) if setting_row else {}
    starting_balance = float(paper_defaults.get("starting_balance", 500))
    by_league: dict[str, float] = {}
    exposure = 0.0
    for position in positions:
        market = db.get(Market, position.market_id)
        league = market.league if market else "Unknown"
        notional = position.quantity * position.avg_price
        by_league[league or "Unknown"] = by_league.get(league or "Unknown", 0.0) + notional
        if position.status == "open":
            exposure += notional
    wins = sum(1 for position in positions if position.settlement_result == "win")
    losses = sum(1 for position in positions if position.settlement_result == "loss")
    pushes = sum(1 for position in positions if position.settlement_result == "push")
    resolved = wins + losses + pushes
    running_pnl = 0.0
    pnl_timeline: list[dict[str, float | str]] = []
    for settlement in settlements:
        running_pnl += settlement.realized_pnl
        pnl_timeline.append(
            {
                "label": settlement.settled_at.date().isoformat(),
                "pnl": round(settlement.realized_pnl, 2),
                "cumulative_pnl": round(running_pnl, 2),
            }
        )
    return PortfolioSummary(
        starting_balance=starting_balance,
        current_balance=round(starting_balance + sum(position.realized_pnl + position.unrealized_pnl for position in positions), 2),
        available_cash=round(starting_balance + sum(position.realized_pnl for position in positions) - exposure, 2),
        open_positions=sum(1 for position in positions if position.status == "open"),
        settled_positions=sum(1 for position in positions if position.status == "settled"),
        wins=wins,
        losses=losses,
        pushes=pushes,
        win_rate=round(wins / resolved, 4) if resolved else 0.0,
        total_unrealized_pnl=round(sum(position.unrealized_pnl for position in positions), 4),
        total_realized_pnl=round(sum(position.realized_pnl for position in positions), 4),
        total_exposure=round(exposure, 2),
        by_league={key: round(value, 2) for key, value in by_league.items()},
        pnl_timeline=pnl_timeline,
    )


@router.get("/paper-trades/settlements", response_model=list[PaperSettlementView])
def list_paper_settlements(db: Session = Depends(get_db)) -> list[PaperSettlementView]:
    rows = db.scalars(select(PaperSettlement).order_by(PaperSettlement.settled_at.desc()).limit(100)).all()
    return [
        PaperSettlementView(
            id=row.id,
            position_id=row.position_id,
            market_id=row.market_id,
            outcome=row.outcome,
            settlement_result=row.settlement_result,
            settlement_price=row.settlement_price,
            realized_pnl=row.realized_pnl,
            home_score=row.home_score,
            away_score=row.away_score,
            settled_at=row.settled_at,
        )
        for row in rows
    ]


@router.post("/paper-trades/settle-ended", response_model=SettlementRunResult)
def settle_ended_paper_trades(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> SettlementRunResult:
    return SettlementService().settle_ended_positions(db, settings)


@router.post("/paper-trades/auto-run", response_model=AutoPaperTradeRunResult)
async def auto_run_paper_trades(
    request: AutoPaperTradeRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AutoPaperTradeRunResult:
    return await AutoPaperTrader().run(db, settings, request)
