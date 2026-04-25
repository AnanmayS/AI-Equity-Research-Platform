from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.db_models import AppSetting, Fixture, Market
from app.schemas.domain import NormalizedMarket
from app.services.market_repository import upsert_market


def seed_demo_data(db: Session) -> None:
    now = datetime.now(UTC)
    markets = [
        NormalizedMarket(
            market_id="demo-ucl-inter-milan-over-25",
            event_id="demo-inter-milan",
            slug="inter-milan-over-under-25",
            question="Inter vs Milan: Total goals over 2.5?",
            description="Demo same-day soccer total market for auto paper trading.",
            league="UEFA Champions League",
            home_team="Inter",
            away_team="Milan",
            start_time=now + timedelta(hours=4),
            market_type="totals",
            line=2.5,
            side_labels=["Over 2.5", "Under 2.5"],
            token_ids=["demo-token-inter-over", "demo-token-inter-under"],
            best_bid=0.43,
            best_ask=0.47,
            midpoint=0.45,
            spread=0.04,
            volume=26400,
            liquidity=8800,
            liquidity_score=0.88,
            status="active",
            raw={"demo": True},
        ),
        NormalizedMarket(
            market_id="demo-epl-ars-che-over-25",
            event_id="demo-ars-che",
            slug="arsenal-chelsea-over-under-25",
            question="Arsenal vs Chelsea: Total goals over 2.5?",
            description="Demo pregame soccer total market.",
            league="Premier League",
            home_team="Arsenal",
            away_team="Chelsea",
            start_time=now + timedelta(days=1, hours=3),
            market_type="totals",
            line=2.5,
            side_labels=["Over 2.5", "Under 2.5"],
            token_ids=["demo-token-over", "demo-token-under"],
            best_bid=0.52,
            best_ask=0.56,
            midpoint=0.54,
            spread=0.04,
            volume=21800,
            liquidity=9400,
            liquidity_score=0.92,
            status="active",
            raw={"demo": True},
        ),
        NormalizedMarket(
            market_id="demo-mls-lafc-sea-under-35",
            event_id="demo-lafc-sea",
            slug="lafc-seattle-under-over-35",
            question="LAFC vs Seattle Sounders: Total goals under 3.5?",
            description="Demo pregame soccer total market.",
            league="MLS",
            home_team="LAFC",
            away_team="Seattle Sounders",
            start_time=now + timedelta(days=1, hours=8),
            market_type="totals",
            line=3.5,
            side_labels=["Over 3.5", "Under 3.5"],
            token_ids=["demo-token-over35", "demo-token-under35"],
            best_bid=0.63,
            best_ask=0.69,
            midpoint=0.66,
            spread=0.06,
            volume=8700,
            liquidity=3100,
            liquidity_score=0.62,
            status="active",
            raw={"demo": True},
        ),
        NormalizedMarket(
            market_id="demo-laliga-rma-bar-1x2",
            event_id="demo-rma-bar",
            slug="real-madrid-barcelona-1x2",
            question="Real Madrid vs Barcelona: match winner?",
            description="Demo pregame soccer 1X2 market.",
            league="La Liga",
            home_team="Real Madrid",
            away_team="Barcelona",
            start_time=now + timedelta(days=3, hours=1),
            market_type="moneyline",
            side_labels=["Real Madrid", "Draw", "Barcelona"],
            token_ids=["demo-token-rma", "demo-token-draw", "demo-token-bar"],
            best_bid=0.41,
            best_ask=0.46,
            midpoint=0.435,
            spread=0.05,
            volume=35500,
            liquidity=12100,
            liquidity_score=1.0,
            status="active",
            raw={"demo": True},
        ),
    ]
    for market in markets:
        upsert_market(db, market)
    fixtures = [
        Fixture(
            id="demo-inter-milan",
            league="UEFA Champions League",
            home_team="Inter",
            away_team="Milan",
            start_time=now + timedelta(hours=4),
            status="scheduled",
            metadata_json={},
        ),
        Fixture(
            id="demo-liv-tot",
            league="Premier League",
            home_team="Liverpool",
            away_team="Tottenham",
            start_time=now + timedelta(days=2),
            status="scheduled",
            metadata_json={},
        ),
    ]
    for fixture in fixtures:
        db.merge(fixture)
    setting = db.get(AppSetting, "ui")
    setting_value = {
        "ai_enabled": False,
        "llm_provider": "disabled",
        "soccer_data_provider": "thesportsdb",
        "paper_defaults": {
            "fill_mode": "market",
            "auto_trading_enabled": True,
            "max_trades_per_day": 5,
            "max_stake_per_trade": 100,
            "starting_balance": 500,
            "min_edge": 0.04,
            "min_confidence": 0.40,
            "same_day_only": True,
        },
    }
    if setting is None:
        db.add(AppSetting(key="ui", value=setting_value))
    else:
        setting.value = setting_value
    db.commit()
