from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from typing import Any

import httpx
from dateutil.parser import parse as parse_datetime
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import Settings
from app.schemas.domain import NormalizedMarket, OrderBookLevel, OrderBookSnapshot


SOCCER_TERMS = (
    "soccer",
    "football",
    "premier league",
    "champions league",
    "ucl",
    "europa league",
    "la liga",
    "serie a",
    "bundesliga",
    "ligue 1",
    "mls",
    "eredivisie",
    "fa cup",
    "coppa italia",
)
SOCCER_LEAGUES = ("epl", "ucl", "mls", "lal", "bun", "sea")
SOCCER_LEAGUE_NAMES = {
    "epl": "Premier League",
    "ucl": "UEFA Champions League",
    "mls": "MLS",
    "lal": "La Liga",
    "bun": "Bundesliga",
    "sea": "Serie A",
}


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_jsonish(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def _parse_time(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        parsed = parse_datetime(str(value))
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=UTC)
        return parsed
    except (TypeError, ValueError):
        return None


def _quote_value(raw: dict[str, Any], key: str) -> float | None:
    value = raw.get(key)
    if isinstance(value, dict):
        return _as_float(value.get("value"), None)  # type: ignore[arg-type]
    return _as_float(value, None)  # type: ignore[arg-type]


def _text(raw: dict[str, Any]) -> str:
    pieces = [
        raw.get("question"),
        raw.get("title"),
        raw.get("description"),
        raw.get("category"),
        raw.get("subcategory"),
        raw.get("slug"),
        raw.get("eventSlug"),
    ]
    events = raw.get("events") or []
    if isinstance(events, list):
        pieces.extend(str(event.get("title", "")) for event in events if isinstance(event, dict))
    return " ".join(str(piece or "") for piece in pieces).lower()


def looks_like_soccer_market(raw: dict[str, Any]) -> bool:
    text = _text(raw)
    if any(term in text for term in SOCCER_TERMS):
        return True
    sport = str(raw.get("sport") or raw.get("sports") or "").lower()
    if "soccer" in sport or "football" in sport:
        return True
    tags = raw.get("tags") or []
    if isinstance(tags, list):
        return any("soccer" in str(tag).lower() or "football" in str(tag).lower() for tag in tags)
    return False


def infer_market_type(raw: dict[str, Any], labels: list[str]) -> tuple[str, float | None]:
    text = _text(raw)
    market_type = str(raw.get("sportsMarketType") or raw.get("sportsMarketTypeV2") or raw.get("marketType") or "").lower()
    if "drawable_outcome" in market_type:
        return "moneyline", None
    if "moneyline" in market_type:
        return "moneyline", None
    if "total" in market_type:
        line = _as_float(raw.get("line"), None)  # type: ignore[arg-type]
        if line is None:
            total_match = re.search(r"(?:over|under|total|o/u).*?(\d+(?:\.\d+)?)", text)
            line = _as_float(total_match.group(1), 2.5) if total_match else 2.5
        return "totals", line
    if any(label.lower() in {"home", "away", "draw"} for label in labels):
        return "moneyline", None
    if re.search(r"\b(1x2|moneyline|winner|to win)\b", text) and "total" not in text:
        return "moneyline", None
    total_match = re.search(r"(?:over|under|total|o/u).*?(\d+(?:\.\d+)?)", text)
    if total_match or any(label.lower().startswith(("over", "under")) for label in labels):
        line = _as_float(total_match.group(1), 2.5) if total_match else 2.5
        return "totals", line
    return "unknown", None


def infer_teams(raw: dict[str, Any]) -> tuple[str | None, str | None]:
    for key in ("homeTeam", "home_team", "home_team_name"):
        home = raw.get(key)
        if home:
            break
    else:
        home = None
    for key in ("awayTeam", "away_team", "away_team_name"):
        away = raw.get(key)
        if away:
            break
    else:
        away = None

    if home and away:
        return str(home), str(away)

    participants = raw.get("participants") or []
    if isinstance(participants, list):
        team_names: list[str] = []
        for participant in participants:
            if not isinstance(participant, dict):
                continue
            team = participant.get("team")
            if isinstance(team, dict):
                team_name = team.get("safeName") or team.get("name") or team.get("alias")
                if team_name:
                    team_names.append(str(team_name))
        if len(team_names) >= 2:
            return team_names[0], team_names[1]

    question = str(raw.get("question") or raw.get("title") or "")
    match = re.search(r"(.+?)\s+(?:vs\.?|v\.?)\s+(.+?)(?:\?|$)", question, re.I)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return None, None


def _sports_league_name(event: dict[str, Any]) -> str | None:
    league = event.get("league")
    if isinstance(league, dict):
        slug = league.get("slug")
        if slug in SOCCER_LEAGUE_NAMES:
            return SOCCER_LEAGUE_NAMES[slug]
        name = league.get("name")
        if name:
            return str(name)
    for tag in event.get("tags") or []:
        if not isinstance(tag, dict):
            continue
        slug = tag.get("slug")
        if slug in SOCCER_LEAGUE_NAMES:
            return SOCCER_LEAGUE_NAMES[slug]
        league = tag.get("league")
        if isinstance(league, dict):
            nested_slug = league.get("slug")
            if nested_slug in SOCCER_LEAGUE_NAMES:
                return SOCCER_LEAGUE_NAMES[nested_slug]
            if league.get("name"):
                return str(league["name"])
    return None


def _sports_outcome_label(raw_market: dict[str, Any], event: dict[str, Any]) -> str:
    question = str(raw_market.get("question") or "")
    if "draw" in question.lower():
        return "Draw"
    for side in raw_market.get("marketSides") or []:
        if not isinstance(side, dict):
            continue
        team = side.get("team")
        if isinstance(team, dict):
            team_name = team.get("safeName") or team.get("name") or team.get("alias")
            if team_name:
                return str(team_name)
    home, away = infer_teams(event)
    return home or away or "Yes"


def normalize_sports_market(raw_market: dict[str, Any], event: dict[str, Any]) -> NormalizedMarket:
    home, away = infer_teams(event)
    outcome_label = _sports_outcome_label(raw_market, event)
    market_type, line = infer_market_type(raw_market, [outcome_label])
    start_time = _parse_time(raw_market.get("gameStartTime") or event.get("startTime") or event.get("startDate"))
    best_bid = _quote_value(raw_market, "bestBidQuote")
    best_ask = _quote_value(raw_market, "bestAskQuote")
    midpoint = None
    spread = None
    if best_bid is not None and best_ask is not None:
        midpoint = round((best_bid + best_ask) / 2, 4)
        spread = round(max(best_ask - best_bid, 0), 4)
    elif best_ask is None and best_bid is None:
        side_prices = [
            _quote_value(side, "quote")
            for side in raw_market.get("marketSides") or []
            if isinstance(side, dict) and str(side.get("description") or "").lower() == "yes"
        ]
        if side_prices and side_prices[0] is not None:
            midpoint = side_prices[0]
            best_bid = side_prices[0]
            best_ask = side_prices[0]
            spread = 0.0

    # The sports gateway omits liquidity/volume fields on these binary outcome markets,
    # so we synthesize a conservative proxy from quote availability and spread.
    liquidity = 0.0
    if best_bid is not None and best_ask is not None:
        liquidity = round(max(250.0, 1000.0 * max(0.0, 1 - (spread or 0.0) * 10)), 2)

    event_title = str(event.get("title") or raw_market.get("question") or "Untitled match")
    if market_type == "moneyline":
        question = f"{event_title}: {outcome_label} to win?" if outcome_label != "Draw" else f"{event_title}: Draw?"
    elif market_type == "totals":
        direction = outcome_label if outcome_label.lower().startswith(("over", "under")) else "Total"
        line_value = _as_float(raw_market.get("line"), line or 2.5)
        question = f"{event_title}: {direction} {line_value:g}?"
    else:
        question = str(raw_market.get("question") or event_title)

    return NormalizedMarket(
        market_id=str(raw_market.get("id") or raw_market.get("conditionId")),
        event_id=str(event.get("id") or raw_market.get("eventId") or "") or None,
        slug=raw_market.get("slug"),
        question=question,
        description=raw_market.get("description") or event.get("description"),
        sport="soccer",
        league=_sports_league_name(event),
        home_team=home,
        away_team=away,
        start_time=start_time,
        market_type=market_type,  # type: ignore[arg-type]
        line=_as_float(raw_market.get("line"), line) if raw_market.get("line") is not None else line,
        side_labels=[outcome_label],
        token_ids=[],
        best_bid=best_bid,
        best_ask=best_ask,
        midpoint=midpoint,
        spread=spread,
        volume=0.0,
        liquidity=liquidity,
        liquidity_score=min(liquidity / 5000, 1.0),
        status="closed" if raw_market.get("closed") else "active" if raw_market.get("active", True) else "inactive",
        raw={"market": raw_market, "event": event},
    )


def normalize_market(raw: dict[str, Any]) -> NormalizedMarket:
    outcomes = _parse_jsonish(raw.get("outcomes") or raw.get("shortOutcomes") or [])
    token_ids = _parse_jsonish(raw.get("clobTokenIds") or raw.get("tokenIds") or [])
    if not isinstance(outcomes, list):
        outcomes = []
    if not isinstance(token_ids, list):
        token_ids = []
    labels = [str(label) for label in outcomes]
    market_type, line = infer_market_type(raw, labels)
    home, away = infer_teams(raw)
    start_time = _parse_time(
        raw.get("gameStartTime")
        or raw.get("startTime")
        or raw.get("startDate")
        or raw.get("endDate")
        or raw.get("eventStartTime")
    )
    best_bid = _as_float(raw.get("bestBid") or raw.get("best_bid"), None)  # type: ignore[arg-type]
    best_ask = _as_float(raw.get("bestAsk") or raw.get("best_ask"), None)  # type: ignore[arg-type]
    midpoint = None
    spread = None
    if best_bid is not None and best_ask is not None:
        midpoint = round((best_bid + best_ask) / 2, 4)
        spread = round(max(best_ask - best_bid, 0), 4)

    active = bool(raw.get("active", True))
    closed = bool(raw.get("closed", False) or raw.get("archived", False))
    status = "closed" if closed else "active" if active else "inactive"

    league = (
        raw.get("league")
        or raw.get("competition")
        or raw.get("series", {}).get("title")
        if isinstance(raw.get("series"), dict)
        else raw.get("category")
    )
    liquidity = _as_float(raw.get("liquidity") or raw.get("liquidityNum") or raw.get("volume"))
    volume = _as_float(raw.get("volume") or raw.get("volumeNum"))

    return NormalizedMarket(
        market_id=str(raw.get("conditionId") or raw.get("id") or raw.get("marketId")),
        event_id=str(raw.get("eventId") or raw.get("event_id") or "") or None,
        slug=raw.get("slug"),
        question=str(raw.get("question") or raw.get("title") or "Untitled market"),
        description=raw.get("description"),
        league=str(league) if league else None,
        home_team=home,
        away_team=away,
        start_time=start_time,
        market_type=market_type,  # type: ignore[arg-type]
        line=line,
        side_labels=labels,
        token_ids=[str(token_id) for token_id in token_ids],
        best_bid=best_bid,
        best_ask=best_ask,
        midpoint=midpoint,
        spread=spread,
        volume=volume,
        liquidity=liquidity,
        liquidity_score=min(liquidity / 5000, 1.0),
        status=status,
        raw=raw,
    )


class PolymarketClient:
    """Public Polymarket client. No authenticated trading methods belong here."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.gamma_base = settings.polymarket_gamma_base_url.rstrip("/")
        self.gateway_base = settings.polymarket_gateway_base_url.rstrip("/")
        self.clob_base = settings.polymarket_clob_base_url.rstrip("/")

    @retry(wait=wait_exponential(multiplier=0.2, min=0.2, max=2), stop=stop_after_attempt(3))
    async def _get(self, url: str, params: dict[str, Any] | None = None) -> Any:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()

    async def fetch_public_markets(self, limit: int = 300) -> list[NormalizedMarket]:
        markets_by_id: dict[str, NormalizedMarket] = {}

        for market in await self.fetch_soccer_event_markets(limit=max(20, min(limit, 50))):
            markets_by_id[market.market_id] = market

        payload = await self._get(
            f"{self.gamma_base}/markets",
            params={"active": "true", "closed": "false", "limit": limit},
        )
        items = payload if isinstance(payload, list) else payload.get("markets", [])
        gamma_markets = [normalize_market(item) for item in items if isinstance(item, dict) and looks_like_soccer_market(item)]
        for market in gamma_markets:
            markets_by_id.setdefault(market.market_id, market)

        return [market for market in markets_by_id.values() if market.market_type in {"moneyline", "totals", "unknown"}]

    async def fetch_soccer_event_markets(self, limit: int = 50) -> list[NormalizedMarket]:
        markets: dict[str, NormalizedMarket] = {}
        for league in SOCCER_LEAGUES:
            try:
                payload = await self._get(
                    f"{self.gateway_base}/v2/leagues/{league}/events",
                    params={"limit": limit, "type": "sport"},
                )
            except httpx.HTTPError:
                continue
            for event in payload.get("events", []) if isinstance(payload, dict) else []:
                if not isinstance(event, dict):
                    continue
                for raw_market in event.get("markets") or []:
                    if not isinstance(raw_market, dict):
                        continue
                    normalized = normalize_sports_market(raw_market, event)
                    markets[normalized.market_id] = normalized
        return list(markets.values())

    async def fetch_sports_metadata(self) -> dict[str, Any]:
        try:
            sports = await self._get(f"{self.gateway_base}/v1/sports")
        except httpx.HTTPError:
            sports = []
        return {"sports": sports}

    async def fetch_market_details(self, market_id: str) -> NormalizedMarket | None:
        try:
            raw = await self._get(f"{self.gamma_base}/markets/{market_id}")
        except httpx.HTTPStatusError:
            raw = await self._get(f"{self.gamma_base}/markets", params={"condition_ids": market_id, "limit": 1})
            if isinstance(raw, list) and raw:
                raw = raw[0]
        if isinstance(raw, dict):
            return normalize_market(raw)
        for league in SOCCER_LEAGUES:
            try:
                payload = await self._get(
                    f"{self.gateway_base}/v2/leagues/{league}/events",
                    params={"limit": 50, "type": "sport"},
                )
            except httpx.HTTPError:
                continue
            for event in payload.get("events", []) if isinstance(payload, dict) else []:
                if not isinstance(event, dict):
                    continue
                for raw_market in event.get("markets") or []:
                    if isinstance(raw_market, dict) and str(raw_market.get("id")) == market_id:
                        return normalize_sports_market(raw_market, event)
        return None

    async def fetch_orderbook_snapshot(self, market_id: str, token_id: str | None) -> OrderBookSnapshot:
        if not token_id:
            return OrderBookSnapshot(market_id=market_id, captured_at=datetime.now(UTC))
        raw = await self._get(f"{self.clob_base}/book", params={"token_id": token_id})
        bids = [
            OrderBookLevel(price=_as_float(level.get("price")), size=_as_float(level.get("size")))
            for level in raw.get("bids", [])
            if isinstance(level, dict)
        ]
        asks = [
            OrderBookLevel(price=_as_float(level.get("price")), size=_as_float(level.get("size")))
            for level in raw.get("asks", [])
            if isinstance(level, dict)
        ]
        best_bid = max((level.price for level in bids), default=None)
        best_ask = min((level.price for level in asks), default=None)
        midpoint = round((best_bid + best_ask) / 2, 4) if best_bid is not None and best_ask is not None else None
        spread = round(best_ask - best_bid, 4) if best_bid is not None and best_ask is not None else None
        return OrderBookSnapshot(
            market_id=market_id,
            token_id=token_id,
            bids=sorted(bids, key=lambda level: level.price, reverse=True)[:20],
            asks=sorted(asks, key=lambda level: level.price)[:20],
            best_bid=best_bid,
            best_ask=best_ask,
            midpoint=midpoint,
            spread=spread,
            captured_at=datetime.now(UTC),
            raw=raw,
        )
