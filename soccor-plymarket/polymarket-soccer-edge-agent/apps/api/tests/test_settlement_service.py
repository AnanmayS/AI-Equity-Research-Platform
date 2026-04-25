from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import Settings
from app.db.session import Base
from app.models.db_models import Fixture, Market, PaperPosition
from app.services.settlement_service import SettlementService


def make_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, expire_on_commit=False)()


def test_settlement_service_closes_resolved_position() -> None:
    db = make_db()
    market = Market(
        market_id="settle-market",
        event_id="settle-fixture",
        question="Liverpool vs Tottenham over 2.5?",
        league="Premier League",
        home_team="Liverpool",
        away_team="Tottenham",
        start_time=datetime.now(UTC) - timedelta(hours=5),
        market_type="totals",
        line=2.5,
        side_labels=["Over 2.5", "Under 2.5"],
        token_ids=["t1", "t2"],
        best_bid=0.80,
        best_ask=0.84,
        midpoint=0.82,
        spread=0.04,
        liquidity=8000,
        status="active",
        raw={"demo": True},
    )
    fixture = Fixture(
        id="settle-fixture",
        league="Premier League",
        home_team="Liverpool",
        away_team="Tottenham",
        start_time=market.start_time,
        status="finished",
        metadata_json={"home_score": 2, "away_score": 2},
    )
    position = PaperPosition(
        market_id="settle-market",
        outcome="Over 2.5",
        quantity=25,
        avg_price=0.56,
        realized_pnl=0,
        unrealized_pnl=0,
        source="auto",
        status="open",
    )
    db.add_all([market, fixture, position])
    db.commit()

    result = SettlementService().settle_ended_positions(db, Settings())
    settled = db.get(PaperPosition, position.id)

    assert result.settled_positions == 1
    assert settled is not None
    assert settled.status == "settled"
    assert settled.realized_pnl == 11.0
    assert settled.settlement_result == "win"

