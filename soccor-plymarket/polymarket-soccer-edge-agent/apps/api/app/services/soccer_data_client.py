from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from dateutil.parser import parse as parse_datetime

from app.core.config import Settings
from app.schemas.domain import FixtureContext, RecentMatch, TeamContext


def parse_time(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        parsed = parse_datetime(str(value))
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=UTC)
        return parsed
    except (TypeError, ValueError):
        return None


class SoccerDataClient(ABC):
    @abstractmethod
    async def fetch_upcoming_fixtures(self, league: str | None = None) -> list[FixtureContext]:
        raise NotImplementedError

    @abstractmethod
    async def fetch_team_context(self, team_name: str, league: str | None = None) -> TeamContext:
        raise NotImplementedError


class TheSportsDBClient(SoccerDataClient):
    def __init__(self, settings: Settings):
        self.base_url = settings.thesportsdb_base_url.rstrip("/")

    async def _get(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(f"{self.base_url}/{path}", params=params)
            response.raise_for_status()
            return response.json()

    async def fetch_upcoming_fixtures(self, league: str | None = None) -> list[FixtureContext]:
        if not league:
            return []
        try:
            payload = await self._get("eventsnextleague.php", {"id": league})
        except httpx.HTTPError:
            return []
        fixtures = []
        for item in payload.get("events") or []:
            start = parse_time(f"{item.get('dateEvent')} {item.get('strTime') or '00:00:00'}")
            fixtures.append(
                FixtureContext(
                    fixture_id=str(item.get("idEvent")),
                    league=item.get("strLeague"),
                    home_team=item.get("strHomeTeam") or "",
                    away_team=item.get("strAwayTeam") or "",
                    start_time=start,
                    status=item.get("strStatus") or "scheduled",
                )
            )
        return fixtures

    async def fetch_team_context(self, team_name: str, league: str | None = None) -> TeamContext:
        try:
            team_payload = await self._get("searchteams.php", {"t": team_name})
        except httpx.HTTPError:
            return demo_team_context(team_name, league)
        team_items = team_payload.get("teams") or []
        team = team_items[0] if team_items else {}
        team_id = team.get("idTeam")
        recent_matches: list[RecentMatch] = []
        if team_id:
            try:
                events_payload = await self._get("eventslast.php", {"id": team_id})
            except httpx.HTTPError:
                events_payload = {}
            for item in events_payload.get("results") or []:
                home = item.get("strHomeTeam")
                away = item.get("strAwayTeam")
                home_goals = int(item.get("intHomeScore") or 0)
                away_goals = int(item.get("intAwayScore") or 0)
                is_home = home and home.lower() == team_name.lower()
                gf = home_goals if is_home else away_goals
                ga = away_goals if is_home else home_goals
                result = "W" if gf > ga else "D" if gf == ga else "L"
                recent_matches.append(
                    RecentMatch(
                        opponent=away if is_home else home or "Unknown",
                        goals_for=gf,
                        goals_against=ga,
                        result=result,  # type: ignore[arg-type]
                        played_at=parse_time(item.get("dateEvent")),
                    )
                )
        context = TeamContext(
            name=team_name,
            league=league or team.get("strLeague"),
            standings_rank=None,
            standings_points=None,
            matches_played=None,
            recent_matches=recent_matches,
        )
        return context if recent_matches else demo_team_context(team_name, league)


class APIFootballClient(SoccerDataClient):
    def __init__(self, settings: Settings):
        self.api_key = settings.apifootball_api_key

    async def fetch_upcoming_fixtures(self, league: str | None = None) -> list[FixtureContext]:
        return []

    async def fetch_team_context(self, team_name: str, league: str | None = None) -> TeamContext:
        return demo_team_context(team_name, league)


class FallbackSoccerDataClient(SoccerDataClient):
    async def fetch_upcoming_fixtures(self, league: str | None = None) -> list[FixtureContext]:
        now = datetime.now(UTC)
        return [
            FixtureContext(
                fixture_id="demo-ars-che",
                league="Premier League",
                home_team="Arsenal",
                away_team="Chelsea",
                start_time=now + timedelta(days=2),
            ),
            FixtureContext(
                fixture_id="demo-rma-bar",
                league="La Liga",
                home_team="Real Madrid",
                away_team="Barcelona",
                start_time=now + timedelta(days=3),
            ),
        ]

    async def fetch_team_context(self, team_name: str, league: str | None = None) -> TeamContext:
        return demo_team_context(team_name, league)


def demo_team_context(team_name: str, league: str | None = None) -> TeamContext:
    seed = sum(ord(char) for char in team_name)
    results = ["W", "D", "L", "W", "D"] if seed % 2 else ["W", "W", "D", "L", "W"]
    matches = []
    for index, result in enumerate(results):
        if result == "W":
            gf, ga = 2 + (seed + index) % 2, index % 2
        elif result == "D":
            gf, ga = 1, 1
        else:
            gf, ga = index % 2, 2
        matches.append(
            RecentMatch(
                opponent=f"Recent Opponent {index + 1}",
                goals_for=gf,
                goals_against=ga,
                result=result,  # type: ignore[arg-type]
                played_at=datetime.now(UTC) - timedelta(days=7 * (index + 1)),
            )
        )
    return TeamContext(
        name=team_name,
        league=league,
        standings_rank=1 + seed % 12,
        standings_points=18 + seed % 20,
        matches_played=10,
        recent_matches=matches,
    )


def build_soccer_client(settings: Settings) -> SoccerDataClient:
    if settings.soccer_data_provider == "api_football" and settings.apifootball_api_key:
        return APIFootballClient(settings)
    if settings.soccer_data_provider == "thesportsdb":
        return TheSportsDBClient(settings)
    return FallbackSoccerDataClient()

