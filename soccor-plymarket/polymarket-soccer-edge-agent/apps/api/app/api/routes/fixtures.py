from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models.db_models import Fixture
from app.schemas.domain import FixtureContext, TeamContext
from app.services.soccer_data_client import build_soccer_client

router = APIRouter(tags=["fixtures"])


@router.get("/fixtures/upcoming", response_model=list[FixtureContext])
async def upcoming_fixtures(
    league: str | None = None,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> list[FixtureContext]:
    rows = db.scalars(select(Fixture).order_by(Fixture.start_time.asc()).limit(50)).all()
    if rows:
        return [
            FixtureContext(
                fixture_id=row.id,
                league=row.league,
                home_team=row.home_team,
                away_team=row.away_team,
                start_time=row.start_time,
                status=row.status,
                home_score=row.metadata_json.get("home_score"),
                away_score=row.metadata_json.get("away_score"),
            )
            for row in rows
            if league is None or row.league == league
        ]
    return await build_soccer_client(settings).fetch_upcoming_fixtures(league)


@router.get("/teams/context", response_model=TeamContext)
async def team_context(
    team_name: str,
    league: str | None = None,
    settings: Settings = Depends(get_settings),
) -> TeamContext:
    return await build_soccer_client(settings).fetch_team_context(team_name, league)
