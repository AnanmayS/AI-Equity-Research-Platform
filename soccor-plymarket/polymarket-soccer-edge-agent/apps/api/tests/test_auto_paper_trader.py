import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import Settings
from app.db.session import Base
from app.models.db_models import Market, PaperOrder
from app.schemas.domain import AutoPaperTradeRequest
from app.services.auto_paper_trader import AutoPaperTrader


def make_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, expire_on_commit=False)()


def test_auto_paper_trader_places_same_day_trade() -> None:
    db = make_db()
    market = Market(
        market_id="auto-market",
        event_id="auto-fixture",
        question="Inter vs Milan over 2.5?",
        league="UEFA Champions League",
        home_team="Inter",
        away_team="Milan",
        start_time=datetime.now(UTC) + timedelta(hours=3),
        market_type="totals",
        line=2.5,
        side_labels=["Over 2.5", "Under 2.5"],
        token_ids=["t1", "t2"],
        best_bid=0.28,
        best_ask=0.32,
        midpoint=0.30,
        spread=0.04,
        liquidity=5000,
        status="active",
        raw={"demo": True},
    )
    db.add(market)
    db.commit()

    result = asyncio.run(
        AutoPaperTrader().run(
            db,
            Settings(app_timezone="UTC"),
            AutoPaperTradeRequest(
                sync_public_markets=False,
                max_stake_per_trade=100,
                min_edge=0.01,
                min_confidence=0.2,
            ),
        )
    )
    order = db.query(PaperOrder).filter_by(market_id="auto-market").one()
    assert result.placed_trades == 1
    assert any(decision.action == "place" for decision in result.decisions)
    assert round(order.quantity * market.best_ask, 2) <= 100.0


def test_auto_paper_trader_respects_daily_trade_cap() -> None:
    db = make_db()
    for index in range(2):
        db.add(
            Market(
                market_id=f"auto-market-{index}",
                event_id=f"auto-fixture-{index}",
                question=f"Demo market {index}",
                league="UEFA Champions League",
                home_team=f"Home {index}",
                away_team=f"Away {index}",
                start_time=datetime.now(UTC) + timedelta(hours=3 + index),
                market_type="totals",
                line=2.5,
                side_labels=["Over 2.5", "Under 2.5"],
                token_ids=[f"t{index}a", f"t{index}b"],
                best_bid=0.28,
                best_ask=0.32,
                midpoint=0.30,
                spread=0.04,
                liquidity=5000,
                status="active",
                raw={"demo": True},
            )
        )
    db.commit()

    result = asyncio.run(
        AutoPaperTrader().run(
            db,
            Settings(app_timezone="UTC"),
            AutoPaperTradeRequest(
                sync_public_markets=False,
                max_stake_per_trade=100,
                max_trades_per_day=1,
                min_edge=0.01,
                min_confidence=0.2,
            ),
        )
    )
    assert result.placed_trades == 1
    assert any("Daily auto-trade cap" in decision.note for decision in result.decisions)
