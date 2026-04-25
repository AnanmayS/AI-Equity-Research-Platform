from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import Settings
from app.db.session import Base
from app.models.db_models import Market
from app.schemas.domain import RiskValidationRequest
from app.services.risk_engine import RiskEngine


def make_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, expire_on_commit=False)()


def test_risk_allows_clean_pregame_market() -> None:
    db = make_db()
    market = Market(
        market_id="risk-ok",
        question="Demo total",
        league="Premier League",
        home_team="Arsenal",
        away_team="Chelsea",
        start_time=datetime.now(UTC) + timedelta(days=2),
        market_type="totals",
        side_labels=["Over 2.5"],
        token_ids=["t1"],
        best_bid=0.50,
        best_ask=0.55,
        midpoint=0.525,
        spread=0.05,
        liquidity=5000,
        status="active",
    )
    db.add(market)
    db.commit()
    result = RiskEngine(Settings()).validate(
        db,
        market,
        RiskValidationRequest(market_id="risk-ok", side="buy", outcome="Over 2.5", quantity=10),
    )
    assert result.allowed


def test_risk_blocks_wide_spread() -> None:
    db = make_db()
    market = Market(
        market_id="risk-bad",
        question="Demo total",
        league="Premier League",
        home_team="Arsenal",
        away_team="Chelsea",
        start_time=datetime.now(UTC) + timedelta(days=2),
        market_type="totals",
        side_labels=["Over 2.5"],
        token_ids=["t1"],
        best_bid=0.40,
        best_ask=0.70,
        midpoint=0.55,
        spread=0.30,
        liquidity=5000,
        status="active",
    )
    db.add(market)
    db.commit()
    result = RiskEngine(Settings()).validate(
        db,
        market,
        RiskValidationRequest(market_id="risk-bad", side="buy", outcome="Over 2.5", quantity=10),
    )
    assert not result.allowed
    assert any("Spread" in reason for reason in result.reasons)

