from __future__ import annotations

import asyncio

from app.core.config import get_settings
from app.db.session import SessionLocal, create_all
from app.models.db_models import AuditLog
from app.schemas.domain import AutoPaperTradeRequest
from app.services.auto_paper_trader import AutoPaperTrader
from app.services.market_repository import upsert_market
from app.services.paper_trading_engine import PaperTradingEngine
from app.services.polymarket_client import PolymarketClient
from app.services.settlement_service import SettlementService


def sync_polymarket_markets() -> dict:
    create_all()
    settings = get_settings()

    async def run() -> int:
        markets = await PolymarketClient(settings).fetch_public_markets(limit=200)
        with SessionLocal() as db:
            for market in markets:
                upsert_market(db, market)
            db.add(
                AuditLog(
                    actor="worker",
                    action="scheduled_polymarket_sync",
                    payload={"count": len(markets)},
                )
            )
            db.commit()
        return len(markets)

    return {"synced": asyncio.run(run())}


def mark_to_market_positions() -> dict:
    create_all()
    with SessionLocal() as db:
        PaperTradingEngine().mark_to_market(db)
        db.add(AuditLog(actor="worker", action="scheduled_mark_to_market", payload={}))
        db.commit()
    return {"status": "ok"}


def auto_trade_same_day_markets() -> dict:
    create_all()
    settings = get_settings()

    async def run() -> dict:
        with SessionLocal() as db:
            result = await AutoPaperTrader().run(db, settings, AutoPaperTradeRequest())
            db.add(
                AuditLog(
                    actor="worker",
                    action="scheduled_auto_paper_trade",
                    payload=result.model_dump(mode="json"),
                )
            )
            db.commit()
            return result.model_dump(mode="json")

    return asyncio.run(run())


def settle_finished_positions() -> dict:
    create_all()
    settings = get_settings()
    with SessionLocal() as db:
        result = SettlementService().settle_ended_positions(db, settings)
        db.add(
            AuditLog(
                actor="worker",
                action="scheduled_paper_settlement",
                payload=result.model_dump(mode="json"),
            )
        )
        db.commit()
    return result.model_dump(mode="json")
