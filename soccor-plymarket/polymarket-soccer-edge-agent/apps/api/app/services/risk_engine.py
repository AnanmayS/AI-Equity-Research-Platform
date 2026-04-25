from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.db_models import Market, PaperFill, RiskEvent
from app.schemas.domain import RiskValidationRequest, RiskValidationResult


class RiskEngine:
    def __init__(self, settings: Settings):
        self.settings = settings

    def validate(self, db: Session, market: Market, request: RiskValidationRequest) -> RiskValidationResult:
        reasons: list[str] = []
        notional = request.quantity * self._reference_price(market, request.side)

        if not self.settings.paper_trading_only:
            reasons.append("Live execution is disabled in this codebase; paper trading must remain enabled.")
        if market.status != "active":
            reasons.append("Market is not active.")
        if market.market_type not in {"moneyline", "totals"}:
            reasons.append("Market type is ambiguous or unsupported.")
        if not market.home_team or not market.away_team or not market.start_time:
            reasons.append("Market is missing required soccer metadata.")
        start_time = self._aware(market.start_time)
        if start_time and start_time <= datetime.now(UTC) + timedelta(
            minutes=self.settings.risk_minutes_before_start
        ):
            reasons.append(
                f"Market starts within {self.settings.risk_minutes_before_start} minutes or has already started."
            )
        if market.liquidity < self.settings.risk_min_liquidity:
            reasons.append(f"Liquidity {market.liquidity:.0f} is below the configured minimum.")
        if market.spread is None or market.spread > self.settings.risk_max_spread:
            reasons.append("Spread is missing or wider than the configured maximum.")
        if self.settings.league_whitelist and market.league not in self.settings.league_whitelist:
            reasons.append("League is not in the configured whitelist.")
        if notional > self.settings.risk_max_stake:
            reasons.append("Requested notional exceeds maximum stake per paper trade.")

        today = datetime.now(UTC).date()
        filled_today = db.scalar(
            select(func.coalesce(func.sum(PaperFill.quantity * PaperFill.price), 0)).where(
                func.date(PaperFill.created_at) == today
            )
        )
        projected = float(filled_today or 0) + notional
        if projected > self.settings.risk_max_daily_exposure:
            reasons.append("Projected daily exposure exceeds configured maximum.")

        allowed = len(reasons) == 0
        severity = "info" if allowed else "block"
        if not allowed:
            db.add(
                RiskEvent(
                    market_id=market.market_id,
                    severity=severity,
                    code="paper_trade_rejected",
                    message="; ".join(reasons),
                    metadata_json={"request": request.model_dump(), "projected_daily_exposure": projected},
                )
            )
            db.commit()
        return RiskValidationResult(
            allowed=allowed,
            severity=severity,  # type: ignore[arg-type]
            reasons=reasons or ["Paper trade passes configured pregame risk checks."],
            max_allowed_stake=self.settings.risk_max_stake,
            projected_daily_exposure=round(projected, 2),
        )

    @staticmethod
    def _reference_price(market: Market, side: str) -> float:
        if side == "buy":
            return market.best_ask or market.midpoint or 0.5
        return market.best_bid or market.midpoint or 0.5

    @staticmethod
    def _aware(value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


def risk_status(db: Session, settings: Settings) -> dict:
    today = datetime.now(UTC).date()
    exposure = db.scalar(
        select(func.coalesce(func.sum(PaperFill.quantity * PaperFill.price), 0)).where(
            func.date(PaperFill.created_at) == today
        )
    )
    recent_blocks = db.scalars(
        select(RiskEvent).order_by(RiskEvent.created_at.desc()).limit(10)
    ).all()
    return {
        "paper_trading_only": settings.paper_trading_only,
        "daily_exposure": round(float(exposure or 0), 2),
        "max_daily_exposure": settings.risk_max_daily_exposure,
        "max_stake": settings.risk_max_stake,
        "min_liquidity": settings.risk_min_liquidity,
        "max_spread": settings.risk_max_spread,
        "league_whitelist": sorted(settings.league_whitelist),
        "recent_events": [
            {
                "code": event.code,
                "severity": event.severity,
                "message": event.message,
                "created_at": event.created_at.isoformat(),
            }
            for event in recent_blocks
        ],
    }
