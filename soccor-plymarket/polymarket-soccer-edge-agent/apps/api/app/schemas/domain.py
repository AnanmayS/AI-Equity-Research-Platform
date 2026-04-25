from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


MarketType = Literal["moneyline", "totals", "unknown"]
TradeSide = Literal["buy", "sell"]
FillMode = Literal["market", "limit"]


class NormalizedMarket(BaseModel):
    market_id: str
    event_id: str | None = None
    slug: str | None = None
    question: str
    description: str | None = None
    sport: str = "soccer"
    league: str | None = None
    home_team: str | None = None
    away_team: str | None = None
    start_time: datetime | None = None
    market_type: MarketType = "unknown"
    line: float | None = None
    side_labels: list[str] = Field(default_factory=list)
    token_ids: list[str] = Field(default_factory=list)
    best_bid: float | None = None
    best_ask: float | None = None
    midpoint: float | None = None
    spread: float | None = None
    volume: float = 0
    liquidity: float = 0
    liquidity_score: float = 0
    status: str = "unknown"
    raw: dict = Field(default_factory=dict)


class OrderBookLevel(BaseModel):
    price: float
    size: float


class OrderBookSnapshot(BaseModel):
    market_id: str
    token_id: str | None = None
    bids: list[OrderBookLevel] = Field(default_factory=list)
    asks: list[OrderBookLevel] = Field(default_factory=list)
    best_bid: float | None = None
    best_ask: float | None = None
    midpoint: float | None = None
    spread: float | None = None
    captured_at: datetime
    raw: dict = Field(default_factory=dict)


class RecentMatch(BaseModel):
    opponent: str
    goals_for: int
    goals_against: int
    result: Literal["W", "D", "L"]
    played_at: datetime | None = None


class TeamContext(BaseModel):
    name: str
    league: str | None = None
    standings_rank: int | None = None
    standings_points: int | None = None
    matches_played: int | None = None
    recent_matches: list[RecentMatch] = Field(default_factory=list)


class FixtureContext(BaseModel):
    fixture_id: str
    league: str | None = None
    home_team: str
    away_team: str
    start_time: datetime | None = None
    status: str = "scheduled"
    home_score: int | None = None
    away_score: int | None = None


class PricingRequest(BaseModel):
    market_id: str
    outcome: str | None = None


class PricingResult(BaseModel):
    market_id: str
    market_type: str
    outcome: str
    fair_probability: float
    market_implied_probability: float | None
    raw_edge: float | None
    confidence: float
    confidence_band: tuple[float, float]
    assumptions: list[str]
    reasons: list[str]
    warnings: list[str] = Field(default_factory=list)
    inputs: dict = Field(default_factory=dict)


class RiskValidationRequest(BaseModel):
    market_id: str
    side: TradeSide
    outcome: str
    quantity: float = Field(gt=0)
    limit_price: float | None = Field(default=None, ge=0, le=1)
    fill_mode: FillMode = "market"


class RiskValidationResult(BaseModel):
    allowed: bool
    severity: Literal["info", "warning", "block"]
    reasons: list[str]
    max_allowed_stake: float
    projected_daily_exposure: float


class PaperTradeRequest(RiskValidationRequest):
    reason: str | None = None
    source: str = "manual"
    strategy_tag: str | None = None


class PaperTradeResult(BaseModel):
    order_id: str
    fill_id: str | None = None
    status: str
    fill_price: float | None = None
    quantity: float
    simulated: bool = True
    assumptions: list[str]
    source: str = "manual"


class PositionView(BaseModel):
    id: str
    market_id: str
    outcome: str
    quantity: float
    avg_price: float
    realized_pnl: float
    unrealized_pnl: float
    source: str
    opened_at: datetime
    settled_at: datetime | None = None
    settlement_result: str | None = None
    settlement_price: float | None = None
    status: str


class PaperSettlementView(BaseModel):
    id: str
    position_id: str
    market_id: str
    outcome: str
    settlement_result: str
    settlement_price: float
    realized_pnl: float
    home_score: int | None = None
    away_score: int | None = None
    settled_at: datetime


class PortfolioSummary(BaseModel):
    starting_balance: float
    current_balance: float
    available_cash: float
    open_positions: int
    settled_positions: int
    wins: int
    losses: int
    pushes: int
    win_rate: float
    total_unrealized_pnl: float
    total_realized_pnl: float
    total_exposure: float
    by_league: dict[str, float]
    pnl_timeline: list[dict[str, float | str]]


class AutoPaperTradeRequest(BaseModel):
    run_for_today_only: bool = True
    sync_public_markets: bool = True
    min_edge: float = Field(default=0.04, ge=0, le=1)
    min_confidence: float = Field(default=0.40, ge=0, le=1)
    max_trades_per_day: int = Field(default=5, ge=1, le=25)
    max_stake_per_trade: float = Field(default=100, gt=0)


class AutoPaperTradeDecision(BaseModel):
    market_id: str
    outcome: str
    action: str
    edge: float | None = None
    confidence: float | None = None
    note: str


class AutoPaperTradeRunResult(BaseModel):
    scanned_markets: int
    placed_trades: int
    decisions: list[AutoPaperTradeDecision]


class SettlementRunResult(BaseModel):
    checked_positions: int
    settled_positions: int
    settlements: list[PaperSettlementView]


class AgentExplainRequest(BaseModel):
    market_id: str
    outcome: str | None = None


class AgentExplanation(BaseModel):
    market_id: str
    provider: str
    text: str
    deterministic_only: bool


class SettingsPayload(BaseModel):
    ai_enabled: bool = False
    llm_provider: str = "disabled"
    soccer_data_provider: str = "thesportsdb"
    paper_defaults: dict = Field(
        default_factory=lambda: {
            "fill_mode": "market",
            "auto_trading_enabled": True,
            "max_trades_per_day": 5,
            "max_stake_per_trade": 100,
            "starting_balance": 500,
            "min_edge": 0.04,
            "min_confidence": 0.40,
            "same_day_only": True,
        }
    )
    risk: dict = Field(default_factory=dict)

    @field_validator("llm_provider")
    @classmethod
    def validate_provider(cls, value: str) -> str:
        allowed = {"disabled", "gemini", "openrouter", "ollama"}
        if value not in allowed:
            raise ValueError(f"llm_provider must be one of {sorted(allowed)}")
        return value
