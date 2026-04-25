from typing import Literal, TypedDict


MarketType = Literal["moneyline", "totals", "unknown"]
TradeSide = Literal["buy", "sell"]
FillMode = Literal["market", "limit"]


class NormalizedSoccerMarket(TypedDict, total=False):
    market_id: str
    event_id: str | None
    sport: Literal["soccer"]
    league: str | None
    home_team: str | None
    away_team: str | None
    start_time: str | None
    market_type: MarketType
    side_labels: list[str]
    token_ids: list[str]
    best_bid: float | None
    best_ask: float | None
    spread: float | None
    status: str
    liquidity_score: float

