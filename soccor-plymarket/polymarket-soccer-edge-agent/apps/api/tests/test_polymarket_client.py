from app.services.polymarket_client import normalize_sports_market


def test_normalize_sports_market_maps_drawable_outcome_to_moneyline() -> None:
    event = {
        "id": "9146",
        "title": "Levante UD vs. Sevilla",
        "startTime": "2026-04-23T17:00:00Z",
        "participants": [
            {"team": {"name": "Levante UD", "safeName": "Levante UD"}},
            {"team": {"name": "Sevilla FC", "safeName": "Sevilla"}},
        ],
        "tags": [{"league": {"slug": "lal", "name": "La Liga"}}],
    }
    raw_market = {
        "id": "13690",
        "question": "Levante UD vs. Sevilla 2026",
        "slug": "atc-lal-lev-sev-2026-04-23-lev",
        "description": "Binary yes/no market for the Levante win outcome.",
        "active": True,
        "closed": False,
        "marketType": "drawable_outcome",
        "sportsMarketType": "drawable_outcome",
        "gameStartTime": "2026-04-23T17:00:00Z",
        "bestBidQuote": {"value": "0.38", "currency": "USD"},
        "bestAskQuote": {"value": "0.40", "currency": "USD"},
        "marketSides": [
            {
                "description": "Yes",
                "team": {"name": "Levante UD", "safeName": "Levante UD"},
                "quote": {"value": "0.40", "currency": "USD"},
            },
            {
                "description": "No",
                "team": {"name": "Levante UD", "safeName": "Levante UD"},
                "quote": {"value": "0.62", "currency": "USD"},
            },
        ],
    }

    normalized = normalize_sports_market(raw_market, event)

    assert normalized.market_type == "moneyline"
    assert normalized.league == "La Liga"
    assert normalized.home_team == "Levante UD"
    assert normalized.away_team == "Sevilla"
    assert normalized.side_labels == ["Levante UD"]
    assert normalized.best_bid == 0.38
    assert normalized.best_ask == 0.4
    assert normalized.liquidity >= 250
