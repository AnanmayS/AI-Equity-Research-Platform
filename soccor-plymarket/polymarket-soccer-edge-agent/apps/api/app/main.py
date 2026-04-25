from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analysis, audit, fixtures, health, markets, paper, risk, settings, sync
from app.core.config import get_settings
from app.db.session import SessionLocal, create_all, refresh_demo_sqlite_schema_if_needed
from app.seed.demo_data import seed_demo_data


def create_app() -> FastAPI:
    app_settings = get_settings()
    if app_settings.app_mode == "demo":
        refresh_demo_sqlite_schema_if_needed()
    else:
        create_all()
    if app_settings.app_mode in {"demo", "development"}:
        with SessionLocal() as db:
            seed_demo_data(db)

    app = FastAPI(
        title="Polymarket Soccer Edge Agent API",
        version="0.1.0",
        description="Paper-only soccer market analysis API. No authenticated live order placement.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(markets.router)
    app.include_router(analysis.router)
    app.include_router(fixtures.router)
    app.include_router(paper.router)
    app.include_router(risk.router)
    app.include_router(settings.router)
    app.include_router(sync.router)
    app.include_router(audit.router)
    return app


app = create_app()
