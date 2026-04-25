from __future__ import annotations

import math
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.db_models import AuditLog, Market, PaperOrder, PaperPosition
from app.schemas.domain import (
    AutoPaperTradeDecision,
    AutoPaperTradeRequest,
    AutoPaperTradeRunResult,
    PaperTradeRequest,
    PricingRequest,
)
from app.services.analysis_service import calculate_pricing
from app.services.app_settings_service import load_ui_settings
from app.services.paper_trading_engine import PaperTradingEngine
from app.services.risk_engine import RiskEngine
from app.services.sync_service import sync_polymarket_markets
from app.services.time_utils import is_same_local_day, today_bounds_utc


class AutoPaperTrader:
    async def run(self, db: Session, settings: Settings, request: AutoPaperTradeRequest) -> AutoPaperTradeRunResult:
        sync_note: str | None = None
        if request.sync_public_markets:
            try:
                synced = await sync_polymarket_markets(db, settings, limit=300)
                sync_note = f"Refreshed {synced} public soccer markets before scanning."
            except Exception:
                sync_note = "Public market refresh failed, so the scan used the local cache."

        ui_settings = load_ui_settings(db, settings)
        paper_defaults = ui_settings.paper_defaults or {}
        min_edge = request.min_edge or float(paper_defaults.get("min_edge") or 0.04)
        min_confidence = request.min_confidence or float(paper_defaults.get("min_confidence") or 0.40)
        max_trades_per_day = request.max_trades_per_day or int(paper_defaults.get("max_trades_per_day") or 5)
        max_stake_per_trade = request.max_stake_per_trade or float(
            paper_defaults.get("max_stake_per_trade") or settings.risk_max_stake
        )

        markets = db.scalars(
            select(Market).where(Market.sport == "soccer", Market.status == "active").order_by(Market.start_time.asc())
        ).all()
        now = datetime.now(UTC)
        decisions: list[AutoPaperTradeDecision] = []
        placed = 0
        scanned = 0
        placed_today = self._placed_trade_count_today(db, settings.app_timezone)
        for market in markets:
            if request.run_for_today_only and not is_same_local_day(market.start_time, settings.app_timezone):
                continue
            start = market.start_time if market.start_time and market.start_time.tzinfo else (
                market.start_time.replace(tzinfo=UTC) if market.start_time else None
            )
            if start is None or start <= now:
                continue
            scanned += 1
            if placed_today + placed >= max_trades_per_day:
                decisions.append(
                    AutoPaperTradeDecision(
                        market_id=market.market_id,
                        outcome="-",
                        action="skip",
                        note=f"Daily auto-trade cap of {max_trades_per_day} bets already reached.",
                    )
                )
                continue
            if self._has_existing_trade(db, market.market_id):
                decisions.append(
                    AutoPaperTradeDecision(
                        market_id=market.market_id,
                        outcome="-",
                        action="skip",
                        note="Market already has an open or prior paper trade.",
                    )
                )
                continue
            best = await self._best_candidate(db, settings, market.market_id)
            if best is None:
                decisions.append(
                    AutoPaperTradeDecision(
                        market_id=market.market_id,
                        outcome="-",
                        action="skip",
                        note="No normalized outcome produced a usable edge.",
                    )
                )
                continue
            if (best.raw_edge or 0) < min_edge or best.confidence < min_confidence:
                decisions.append(
                    AutoPaperTradeDecision(
                        market_id=market.market_id,
                        outcome=best.outcome,
                        action="skip",
                        edge=best.raw_edge,
                        confidence=best.confidence,
                        note="Edge or confidence is below the auto-trade threshold.",
                    )
                )
                continue
            reference_price = market.best_ask or market.midpoint or 0.5
            quantity = math.floor((max_stake_per_trade / max(reference_price, 0.01)) * 100) / 100
            trade_request = PaperTradeRequest(
                market_id=market.market_id,
                side="buy",
                outcome=best.outcome,
                quantity=quantity,
                fill_mode="market",
                reason="Auto paper trade for same-day pregame soccer market.",
                source="auto",
                strategy_tag="same-day-edge-v1",
            )
            validation = RiskEngine(settings).validate(db, market, trade_request)
            if not validation.allowed:
                decisions.append(
                    AutoPaperTradeDecision(
                        market_id=market.market_id,
                        outcome=best.outcome,
                        action="reject",
                        edge=best.raw_edge,
                        confidence=best.confidence,
                        note="; ".join(validation.reasons),
                    )
                )
                continue
            PaperTradingEngine().place_trade(db, market, trade_request)
            db.add(
                AuditLog(
                    actor="auto_paper_trader",
                    action="auto_paper_trade_placed",
                    market_id=market.market_id,
                    payload={
                        "outcome": best.outcome,
                        "edge": best.raw_edge,
                        "confidence": best.confidence,
                        "quantity": quantity,
                        "notional": round(quantity * reference_price, 2),
                    },
                )
            )
            db.commit()
            placed += 1
            decisions.append(
                AutoPaperTradeDecision(
                    market_id=market.market_id,
                    outcome=best.outcome,
                    action="place",
                    edge=best.raw_edge,
                    confidence=best.confidence,
                    note="Auto paper trade placed.",
                )
            )
        if sync_note:
            decisions.insert(
                0,
                AutoPaperTradeDecision(
                    market_id="-",
                    outcome="-",
                    action="info",
                    note=sync_note,
                ),
            )
        return AutoPaperTradeRunResult(scanned_markets=scanned, placed_trades=placed, decisions=decisions)

    async def _best_candidate(self, db: Session, settings: Settings, market_id: str):
        market = db.get(Market, market_id)
        if market is None:
            return None
        labels = market.side_labels or []
        best = None
        for label in labels:
            pricing = await calculate_pricing(db, settings, PricingRequest(market_id=market_id, outcome=label))
            if best is None or ((pricing.raw_edge or -1) > (best.raw_edge or -1)):
                best = pricing
        return best

    @staticmethod
    def _has_existing_trade(db: Session, market_id: str) -> bool:
        existing_position = db.scalar(
            select(PaperPosition).where(PaperPosition.market_id == market_id, PaperPosition.status == "open")
        )
        existing_order = db.scalar(
            select(PaperOrder).where(PaperOrder.market_id == market_id, PaperOrder.source == "auto")
        )
        return existing_position is not None or existing_order is not None

    @staticmethod
    def _placed_trade_count_today(db: Session, timezone_name: str) -> int:
        start, end = today_bounds_utc(timezone_name)
        return int(
            db.scalar(
                select(func.count(PaperOrder.id)).where(
                    PaperOrder.source == "auto",
                    PaperOrder.created_at >= start,
                    PaperOrder.created_at <= end,
                )
            )
            or 0
        )
