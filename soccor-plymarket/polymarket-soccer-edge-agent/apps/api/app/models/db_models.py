from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def now_utc() -> datetime:
    return datetime.now(UTC)


class Market(Base):
    __tablename__ = "markets"

    market_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    event_id: Mapped[str | None] = mapped_column(String(128), index=True)
    slug: Mapped[str | None] = mapped_column(String(255), index=True)
    question: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    sport: Mapped[str] = mapped_column(String(64), default="soccer", index=True)
    league: Mapped[str | None] = mapped_column(String(128), index=True)
    home_team: Mapped[str | None] = mapped_column(String(128), index=True)
    away_team: Mapped[str | None] = mapped_column(String(128), index=True)
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    market_type: Mapped[str] = mapped_column(String(64), index=True)
    line: Mapped[float | None] = mapped_column(Float)
    side_labels: Mapped[list[str]] = mapped_column(JSON, default=list)
    token_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    best_bid: Mapped[float | None] = mapped_column(Float)
    best_ask: Mapped[float | None] = mapped_column(Float)
    midpoint: Mapped[float | None] = mapped_column(Float)
    spread: Mapped[float | None] = mapped_column(Float)
    volume: Mapped[float] = mapped_column(Float, default=0)
    liquidity: Mapped[float] = mapped_column(Float, default=0)
    liquidity_score: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(32), default="unknown", index=True)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, onupdate=now_utc
    )

    snapshots: Mapped[list["MarketSnapshot"]] = relationship(back_populates="market")


class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    market_id: Mapped[str] = mapped_column(ForeignKey("markets.market_id"), index=True)
    best_bid: Mapped[float | None] = mapped_column(Float)
    best_ask: Mapped[float | None] = mapped_column(Float)
    midpoint: Mapped[float | None] = mapped_column(Float)
    spread: Mapped[float | None] = mapped_column(Float)
    orderbook: Mapped[dict] = mapped_column(JSON, default=dict)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)

    market: Mapped[Market] = relationship(back_populates="snapshots")


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), index=True)
    league: Mapped[str | None] = mapped_column(String(128), index=True)
    country: Mapped[str | None] = mapped_column(String(64))
    external_ids: Mapped[dict] = mapped_column(JSON, default=dict)
    recent_form: Mapped[dict] = mapped_column(JSON, default=dict)
    standings: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class Fixture(Base):
    __tablename__ = "fixtures"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    league: Mapped[str | None] = mapped_column(String(128), index=True)
    home_team: Mapped[str] = mapped_column(String(128), index=True)
    away_team: Mapped[str] = mapped_column(String(128), index=True)
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String(32), default="scheduled")
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class PricingRun(Base):
    __tablename__ = "pricing_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    market_id: Mapped[str] = mapped_column(String(128), index=True)
    market_type: Mapped[str] = mapped_column(String(64))
    fair_probability: Mapped[float] = mapped_column(Float)
    market_probability: Mapped[float | None] = mapped_column(Float)
    raw_edge: Mapped[float | None] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)
    model_version: Mapped[str] = mapped_column(String(64), default="heuristic-v1")
    inputs: Mapped[dict] = mapped_column(JSON, default=dict)
    output: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


class PaperOrder(Base):
    __tablename__ = "paper_orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    market_id: Mapped[str] = mapped_column(String(128), index=True)
    side: Mapped[str] = mapped_column(String(16))
    outcome: Mapped[str] = mapped_column(String(128))
    quantity: Mapped[float] = mapped_column(Float)
    limit_price: Mapped[float | None] = mapped_column(Float)
    fill_mode: Mapped[str] = mapped_column(String(32), default="market")
    source: Mapped[str] = mapped_column(String(32), default="manual", index=True)
    strategy_tag: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="pending")
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


class PaperFill(Base):
    __tablename__ = "paper_fills"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    order_id: Mapped[str] = mapped_column(ForeignKey("paper_orders.id"), index=True)
    market_id: Mapped[str] = mapped_column(String(128), index=True)
    side: Mapped[str] = mapped_column(String(16))
    outcome: Mapped[str] = mapped_column(String(128))
    quantity: Mapped[float] = mapped_column(Float)
    price: Mapped[float] = mapped_column(Float)
    simulated: Mapped[bool] = mapped_column(Boolean, default=True)
    assumptions: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


class PaperPosition(Base):
    __tablename__ = "paper_positions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    market_id: Mapped[str] = mapped_column(String(128), index=True)
    outcome: Mapped[str] = mapped_column(String(128), index=True)
    quantity: Mapped[float] = mapped_column(Float, default=0)
    avg_price: Mapped[float] = mapped_column(Float, default=0)
    realized_pnl: Mapped[float] = mapped_column(Float, default=0)
    unrealized_pnl: Mapped[float] = mapped_column(Float, default=0)
    source: Mapped[str] = mapped_column(String(32), default="manual", index=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    settlement_result: Mapped[str | None] = mapped_column(String(32))
    settlement_price: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(32), default="open", index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class PaperSettlement(Base):
    __tablename__ = "paper_settlements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    position_id: Mapped[str] = mapped_column(ForeignKey("paper_positions.id"), index=True)
    market_id: Mapped[str] = mapped_column(String(128), index=True)
    outcome: Mapped[str] = mapped_column(String(128))
    settlement_result: Mapped[str] = mapped_column(String(32))
    settlement_price: Mapped[float] = mapped_column(Float)
    realized_pnl: Mapped[float] = mapped_column(Float)
    home_score: Mapped[int | None] = mapped_column(default=None)
    away_score: Mapped[int | None] = mapped_column(default=None)
    notes: Mapped[dict] = mapped_column(JSON, default=dict)
    settled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


class RiskEvent(Base):
    __tablename__ = "risk_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    market_id: Mapped[str | None] = mapped_column(String(128), index=True)
    severity: Mapped[str] = mapped_column(String(16), default="info")
    code: Mapped[str] = mapped_column(String(64), index=True)
    message: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    market_id: Mapped[str | None] = mapped_column(String(128), index=True)
    provider: Mapped[str] = mapped_column(String(64), default="disabled")
    prompt: Mapped[str] = mapped_column(Text)
    response: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    actor: Mapped[str] = mapped_column(String(64), default="system")
    action: Mapped[str] = mapped_column(String(128), index=True)
    market_id: Mapped[str | None] = mapped_column(String(128), index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
