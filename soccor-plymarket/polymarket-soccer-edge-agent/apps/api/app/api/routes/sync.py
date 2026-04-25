from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models.db_models import AuditLog, Fixture
from app.services.soccer_data_client import build_soccer_client
from app.services.sync_service import sync_polymarket_markets

router = APIRouter(tags=["sync"])


@router.post("/sync/polymarket")
async def sync_polymarket(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    synced = await sync_polymarket_markets(db, settings, limit=300)
    return {"synced": synced}


@router.post("/sync/soccer-data")
async def sync_soccer_data(
    league: str | None = None,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    client = build_soccer_client(settings)
    fixtures = await client.fetch_upcoming_fixtures(league)
    for fixture in fixtures:
        db.merge(
            Fixture(
                id=fixture.fixture_id,
                league=fixture.league,
                home_team=fixture.home_team,
                away_team=fixture.away_team,
                start_time=fixture.start_time,
                status=fixture.status,
                metadata_json=fixture.model_dump(mode="json"),
            )
        )
    db.add(
        AuditLog(
            actor="sync",
            action="soccer_data_sync",
            payload={"fixtures_seen": len(fixtures), "provider": settings.soccer_data_provider},
        )
    )
    db.commit()
    return {"synced": len(fixtures)}
