from datetime import UTC, datetime, timedelta

from app.schemas.domain import NormalizedMarket
from app.services.pricing_engine import PricingEngine
from app.services.soccer_data_client import demo_team_context


def test_totals_pricing_returns_explainable_probability() -> None:
    market = NormalizedMarket(
        market_id="m1",
        question="Arsenal vs Chelsea over 2.5?",
        league="Premier League",
        home_team="Arsenal",
        away_team="Chelsea",
        start_time=datetime.now(UTC) + timedelta(days=1),
        market_type="totals",
        line=2.5,
        side_labels=["Over 2.5", "Under 2.5"],
        best_ask=0.54,
        best_bid=0.50,
        midpoint=0.52,
        spread=0.04,
        liquidity=1000,
        status="active",
    )
    result = PricingEngine().price_market(
        market,
        demo_team_context("Arsenal", "Premier League"),
        demo_team_context("Chelsea", "Premier League"),
        "Over 2.5",
    )
    assert 0.01 <= result.fair_probability <= 0.99
    assert result.market_type == "totals"
    assert result.assumptions
    assert result.reasons


def test_moneyline_probabilities_are_bounded() -> None:
    market = NormalizedMarket(
        market_id="m2",
        question="Real Madrid vs Barcelona winner?",
        league="La Liga",
        home_team="Real Madrid",
        away_team="Barcelona",
        start_time=datetime.now(UTC) + timedelta(days=1),
        market_type="moneyline",
        side_labels=["Real Madrid", "Draw", "Barcelona"],
        best_ask=0.46,
        best_bid=0.41,
        midpoint=0.435,
        spread=0.05,
        liquidity=1000,
        status="active",
    )
    result = PricingEngine().price_market(
        market,
        demo_team_context("Real Madrid", "La Liga"),
        demo_team_context("Barcelona", "La Liga"),
        "Real Madrid",
    )
    assert 0.01 <= result.fair_probability <= 0.99
    assert result.confidence_band[0] < result.fair_probability < result.confidence_band[1]

