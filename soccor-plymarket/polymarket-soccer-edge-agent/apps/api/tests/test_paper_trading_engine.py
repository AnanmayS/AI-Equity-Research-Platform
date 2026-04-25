from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.session import Base
from app.models.db_models import Market, PaperPosition
from app.schemas.domain import PaperTradeRequest
from app.services.paper_trading_engine import PaperTradingEngine


def make_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, expire_on_commit=False)()


def test_market_buy_fills_at_best_ask_and_updates_position() -> None:
    db = make_db()
    market = Market(
        market_id="paper-ok",
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
    result = PaperTradingEngine().place_trade(
        db,
        market,
        PaperTradeRequest(market_id="paper-ok", side="buy", outcome="Over 2.5", quantity=20),
    )
    position = db.query(PaperPosition).filter_by(market_id="paper-ok").one()
    assert result.fill_price == 0.55
    assert position.quantity == 20
    assert position.avg_price == 0.55

