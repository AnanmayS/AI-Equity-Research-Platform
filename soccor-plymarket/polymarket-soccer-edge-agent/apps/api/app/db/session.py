from collections.abc import Generator

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def _engine_args(database_url: str) -> dict:
    if database_url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {"pool_pre_ping": True}


settings = get_settings()
engine = create_engine(settings.database_url, **_engine_args(settings.database_url))
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all() -> None:
    from app.models.db_models import (  # noqa: F401
        AgentRun,
        AppSetting,
        AuditLog,
        Fixture,
        Market,
        MarketSnapshot,
        PaperFill,
        PaperOrder,
        PaperPosition,
        PaperSettlement,
        PricingRun,
        RiskEvent,
        Team,
    )

    Base.metadata.create_all(bind=engine)


def refresh_demo_sqlite_schema_if_needed() -> None:
    if not settings.database_url.startswith("sqlite"):
        create_all()
        return
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    expected_tables = {"paper_settlements", "paper_orders", "paper_positions"}
    rebuild = not expected_tables.issubset(existing_tables)
    if not rebuild and "paper_orders" in existing_tables:
        columns = {column["name"] for column in inspector.get_columns("paper_orders")}
        if {"source", "strategy_tag"} - columns:
            rebuild = True
    if not rebuild and "paper_positions" in existing_tables:
        columns = {column["name"] for column in inspector.get_columns("paper_positions")}
        if {"source", "opened_at", "settled_at", "settlement_result", "settlement_price"} - columns:
            rebuild = True
    if rebuild:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
