from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.db_models import AuditLog, Fixture, Market, PaperPosition, PaperSettlement
from app.schemas.domain import PaperSettlementView, SettlementRunResult


class SettlementService:
    def settle_ended_positions(self, db: Session, settings: Settings) -> SettlementRunResult:
        positions = db.scalars(select(PaperPosition).where(PaperPosition.status == "open")).all()
        settlements: list[PaperSettlementView] = []
        checked = 0
        for position in positions:
            checked += 1
            market = db.get(Market, position.market_id)
            if market is None or not market.start_time:
                continue
            fixture = self._find_fixture(db, market)
            resolution = self._resolve_market(market, position.outcome, fixture)
            if resolution is None:
                continue
            settlement_result, settlement_price, home_score, away_score, notes = resolution
            realized = round((settlement_price - position.avg_price) * position.quantity, 4)
            position.realized_pnl += realized
            position.unrealized_pnl = 0
            position.status = "settled"
            position.settlement_result = settlement_result
            position.settlement_price = settlement_price
            position.settled_at = datetime.now(UTC)
            row = PaperSettlement(
                position_id=position.id,
                market_id=position.market_id,
                outcome=position.outcome,
                settlement_result=settlement_result,
                settlement_price=settlement_price,
                realized_pnl=realized,
                home_score=home_score,
                away_score=away_score,
                notes=notes,
                settled_at=position.settled_at,
            )
            db.add(row)
            db.flush()
            db.add(
                AuditLog(
                    actor="settlement_service",
                    action="paper_position_settled",
                    market_id=position.market_id,
                    payload={
                        "position_id": position.id,
                        "outcome": position.outcome,
                        "settlement_result": settlement_result,
                        "settlement_price": settlement_price,
                        "realized_pnl": realized,
                        "home_score": home_score,
                        "away_score": away_score,
                    },
                )
            )
            settlements.append(
                PaperSettlementView(
                    id=row.id,
                    position_id=position.id,
                    market_id=position.market_id,
                    outcome=position.outcome,
                    settlement_result=settlement_result,
                    settlement_price=settlement_price,
                    realized_pnl=realized,
                    home_score=home_score,
                    away_score=away_score,
                    settled_at=position.settled_at,
                )
            )
        db.commit()
        return SettlementRunResult(
            checked_positions=checked,
            settled_positions=len(settlements),
            settlements=settlements,
        )

    def _find_fixture(self, db: Session, market: Market) -> Fixture | None:
        if market.event_id:
            fixture = db.get(Fixture, market.event_id)
            if fixture:
                return fixture
        if not market.start_time or not market.home_team or not market.away_team:
            return None
        start = market.start_time - timedelta(hours=8)
        end = market.start_time + timedelta(hours=8)
        return db.scalar(
            select(Fixture).where(
                Fixture.home_team == market.home_team,
                Fixture.away_team == market.away_team,
                Fixture.start_time >= start,
                Fixture.start_time <= end,
            )
        )

    def _resolve_market(
        self, market: Market, outcome: str, fixture: Fixture | None
    ) -> tuple[str, float, int | None, int | None, dict] | None:
        raw_scores = {}
        status = None
        if fixture:
            raw_scores = fixture.metadata_json or {}
            status = fixture.status
        if market.raw:
            raw_scores = {**raw_scores, **(market.raw.get("demo_result") or {})}
            status = status or market.raw.get("demo_result", {}).get("status")

        home_score = self._to_int(raw_scores.get("home_score"))
        away_score = self._to_int(raw_scores.get("away_score"))
        if home_score is None or away_score is None:
            return None

        status_text = str(status or "").lower()
        if status_text and status_text not in {"finished", "ft", "final", "ended", "completed"}:
            return None
        if market.start_time:
            start = market.start_time if market.start_time.tzinfo else market.start_time.replace(tzinfo=UTC)
            if start > datetime.now(UTC) and not market.raw.get("demo"):
                return None

        total = home_score + away_score
        outcome_lower = outcome.lower()
        result = "loss"
        price = 0.0
        if market.market_type == "moneyline":
            home = (market.home_team or "").lower()
            away = (market.away_team or "").lower()
            if outcome_lower in {"draw", "tie"}:
                won = home_score == away_score
            elif outcome_lower == home:
                won = home_score > away_score
            else:
                won = away_score > home_score
            if won:
                result = "win"
                price = 1.0
        elif market.market_type == "totals":
            line = market.line or 2.5
            if outcome_lower.startswith("over"):
                won = total > line
                pushed = total == line
            else:
                won = total < line
                pushed = total == line
            if won:
                result = "win"
                price = 1.0
            elif pushed:
                result = "push"
                price = 0.5
        else:
            return None
        return result, price, home_score, away_score, {"resolved_total_goals": total}

    @staticmethod
    def _to_int(value: object) -> int | None:
        try:
            if value is None or value == "":
                return None
            return int(value)
        except (TypeError, ValueError):
            return None
