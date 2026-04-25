from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.db_models import AuditLog, Market, PaperFill, PaperOrder, PaperPosition
from app.schemas.domain import PaperTradeRequest, PaperTradeResult


class PaperTradingEngine:
    def place_trade(self, db: Session, market: Market, request: PaperTradeRequest) -> PaperTradeResult:
        price = self._resolve_fill_price(market, request)
        order = PaperOrder(
            market_id=market.market_id,
            side=request.side,
            outcome=request.outcome,
            quantity=request.quantity,
            limit_price=request.limit_price,
            fill_mode=request.fill_mode,
            source=request.source,
            strategy_tag=request.strategy_tag,
            status="filled" if price is not None else "open",
            reason=request.reason,
        )
        db.add(order)
        db.flush()

        assumptions = [
            "Fill is simulated and never submitted to Polymarket.",
            "Market-style buy uses current best ask; market-style sell uses current best bid.",
            "No slippage beyond top of book is modeled in MVP.",
        ]
        if price is None:
            db.add(
                AuditLog(
                    actor="paper_trading_engine",
                    action="paper_order_opened_unfilled",
                    market_id=market.market_id,
                    payload={"request": request.model_dump(), "assumptions": assumptions},
                )
            )
            db.commit()
            return PaperTradeResult(
                order_id=order.id,
                status=order.status,
                fill_price=None,
                quantity=request.quantity,
                assumptions=assumptions,
                source=request.source,
            )

        fill = PaperFill(
            order_id=order.id,
            market_id=market.market_id,
            side=request.side,
            outcome=request.outcome,
            quantity=request.quantity,
            price=price,
            simulated=True,
            assumptions={"fill_mode": request.fill_mode, "source": "top_of_book"},
        )
        db.add(fill)
        self._update_position(db, market, request, price)
        db.add(
            AuditLog(
                actor="paper_trading_engine",
                action="paper_trade_filled",
                market_id=market.market_id,
                payload={
                    "request": request.model_dump(),
                    "fill_price": price,
                    "simulated": True,
                    "assumptions": assumptions,
                },
            )
        )
        db.commit()
        return PaperTradeResult(
            order_id=order.id,
            fill_id=fill.id,
            status="filled",
            fill_price=price,
            quantity=request.quantity,
            assumptions=assumptions,
            source=request.source,
        )

    def mark_to_market(self, db: Session) -> None:
        positions = db.scalars(select(PaperPosition).where(PaperPosition.status == "open")).all()
        for position in positions:
            market = db.get(Market, position.market_id)
            mark = market.midpoint if market and market.midpoint is not None else position.avg_price
            position.unrealized_pnl = round((mark - position.avg_price) * position.quantity, 4)
        db.commit()

    @staticmethod
    def _resolve_fill_price(market: Market, request: PaperTradeRequest) -> float | None:
        top_price = market.best_ask if request.side == "buy" else market.best_bid
        if top_price is None:
            return None
        if request.fill_mode == "limit":
            if request.limit_price is None:
                return None
            if request.side == "buy" and top_price <= request.limit_price:
                return top_price
            if request.side == "sell" and top_price >= request.limit_price:
                return top_price
            return None
        return top_price

    @staticmethod
    def _update_position(db: Session, market: Market, request: PaperTradeRequest, price: float) -> None:
        position = db.scalar(
            select(PaperPosition).where(
                PaperPosition.market_id == market.market_id,
                PaperPosition.outcome == request.outcome,
                PaperPosition.status == "open",
            )
        )
        if position is None:
            position = PaperPosition(
                market_id=market.market_id,
                outcome=request.outcome,
                quantity=0,
                avg_price=0,
                realized_pnl=0,
                unrealized_pnl=0,
                source=request.source,
                status="open",
            )
            db.add(position)
            db.flush()

        if request.side == "buy":
            total_cost = position.avg_price * position.quantity + price * request.quantity
            position.quantity += request.quantity
            position.avg_price = total_cost / position.quantity if position.quantity else 0
        else:
            sell_quantity = min(request.quantity, position.quantity)
            position.realized_pnl += round((price - position.avg_price) * sell_quantity, 4)
            position.quantity -= sell_quantity
            if position.quantity <= 0:
                position.quantity = 0
                position.status = "closed"
        mark = market.midpoint if market.midpoint is not None else price
        position.unrealized_pnl = round((mark - position.avg_price) * position.quantity, 4)
