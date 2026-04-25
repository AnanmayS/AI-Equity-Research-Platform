from __future__ import annotations

import math

from app.schemas.domain import NormalizedMarket, PricingResult, TeamContext


MODEL_VERSION = "heuristic-v1"


def clamp(value: float, low: float = 0.01, high: float = 0.99) -> float:
    return max(low, min(high, value))


def recent_points(team: TeamContext) -> float:
    points = 0.0
    for match in team.recent_matches:
        points += 3 if match.result == "W" else 1 if match.result == "D" else 0
    return points / max(len(team.recent_matches), 1)


def recent_goal_diff(team: TeamContext) -> float:
    if not team.recent_matches:
        return 0.0
    return sum(match.goals_for - match.goals_against for match in team.recent_matches) / len(
        team.recent_matches
    )


def recent_goals_for(team: TeamContext) -> float:
    if not team.recent_matches:
        return 1.25
    return sum(match.goals_for for match in team.recent_matches) / len(team.recent_matches)


def recent_goals_against(team: TeamContext) -> float:
    if not team.recent_matches:
        return 1.25
    return sum(match.goals_against for match in team.recent_matches) / len(team.recent_matches)


def standings_component(team: TeamContext) -> float:
    if team.standings_rank is None:
        return 0.0
    return (12 - min(team.standings_rank, 20)) / 20


def team_strength(team: TeamContext) -> float:
    return 0.55 * recent_points(team) + 0.25 * recent_goal_diff(team) + 0.20 * standings_component(team)


def softmax(values: list[float]) -> list[float]:
    largest = max(values)
    exps = [math.exp(value - largest) for value in values]
    total = sum(exps)
    return [value / total for value in exps]


def poisson_cdf(k: int, lambda_: float) -> float:
    total = 0.0
    for i in range(k + 1):
        total += math.exp(-lambda_) * lambda_**i / math.factorial(i)
    return total


def implied_probability(market: NormalizedMarket, outcome: str) -> float | None:
    if market.best_ask is not None:
        return clamp(market.best_ask)
    if market.midpoint is not None:
        return clamp(market.midpoint)
    return None


def confidence_from_inputs(home: TeamContext, away: TeamContext, market: NormalizedMarket) -> tuple[float, list[str]]:
    warnings: list[str] = []
    confidence = 0.68
    if len(home.recent_matches) < 4 or len(away.recent_matches) < 4:
        confidence -= 0.18
        warnings.append("Recent form sample is thin.")
    if home.standings_rank is None or away.standings_rank is None:
        confidence -= 0.10
        warnings.append("Standings context is missing or estimated.")
    if market.spread is not None and market.spread > 0.10:
        confidence -= 0.08
        warnings.append("Market spread is wide, so implied price is noisy.")
    if market.market_type == "unknown":
        confidence -= 0.20
        warnings.append("Market type could not be confidently normalized.")
    return clamp(confidence, 0.15, 0.85), warnings


class PricingEngine:
    def price_market(
        self,
        market: NormalizedMarket,
        home: TeamContext,
        away: TeamContext,
        outcome: str | None = None,
    ) -> PricingResult:
        if market.market_type == "totals":
            return self.price_totals(market, home, away, outcome)
        return self.price_moneyline(market, home, away, outcome)

    def price_moneyline(
        self,
        market: NormalizedMarket,
        home: TeamContext,
        away: TeamContext,
        outcome: str | None = None,
    ) -> PricingResult:
        home_strength = team_strength(home) + 0.18
        away_strength = team_strength(away)
        closeness = max(0.0, 1 - abs(home_strength - away_strength))
        draw_score = 0.35 + 0.30 * closeness
        home_score = 0.55 + home_strength
        away_score = 0.55 + away_strength
        home_prob, draw_prob, away_prob = softmax([home_score, draw_score, away_score])
        selected = outcome or self._default_moneyline_outcome(market)
        normalized = selected.lower()
        if normalized in {"home", home.name.lower()}:
            fair = home_prob
            selected = home.name
        elif normalized in {"draw", "tie"}:
            fair = draw_prob
            selected = "Draw"
        else:
            fair = away_prob
            selected = away.name
        confidence, warnings = confidence_from_inputs(home, away, market)
        market_prob = implied_probability(market, selected)
        edge = fair - market_prob if market_prob is not None else None
        band = (clamp(fair - (1 - confidence) / 2), clamp(fair + (1 - confidence) / 2))
        return PricingResult(
            market_id=market.market_id,
            market_type="moneyline",
            outcome=selected,
            fair_probability=round(fair, 4),
            market_implied_probability=market_prob,
            raw_edge=round(edge, 4) if edge is not None else None,
            confidence=round(confidence, 3),
            confidence_band=(round(band[0], 4), round(band[1], 4)),
            assumptions=[
                "Recent results are weighted more than standings.",
                "Home advantage is a fixed additive boost.",
                "Draw probability rises when team strengths are close.",
            ],
            reasons=[
                f"{home.name} strength={home_strength:.2f}, {away.name} strength={away_strength:.2f}.",
                f"Recent goal differential: {home.name} {recent_goal_diff(home):+.2f}, {away.name} {recent_goal_diff(away):+.2f}.",
            ],
            warnings=warnings,
            inputs={"home": home.model_dump(), "away": away.model_dump(), "model_version": MODEL_VERSION},
        )

    def price_totals(
        self,
        market: NormalizedMarket,
        home: TeamContext,
        away: TeamContext,
        outcome: str | None = None,
    ) -> PricingResult:
        line = market.line or 2.5
        expected_home = 0.55 * recent_goals_for(home) + 0.45 * recent_goals_against(away) + 0.12
        expected_away = 0.55 * recent_goals_for(away) + 0.45 * recent_goals_against(home)
        expected_goals = clamp(expected_home + expected_away, 0.5, 5.5)
        under_probability = poisson_cdf(math.floor(line), expected_goals)
        over_probability = 1 - under_probability
        selected = outcome or self._default_total_outcome(market)
        fair = over_probability if selected.lower().startswith("over") else under_probability
        selected = f"Over {line:g}" if selected.lower().startswith("over") else f"Under {line:g}"
        confidence, warnings = confidence_from_inputs(home, away, market)
        if expected_goals > 4.2 or expected_goals < 1.1:
            warnings.append("Expected-goals estimate is extreme for this simple model.")
            confidence = clamp(confidence - 0.08, 0.15, 0.85)
        market_prob = implied_probability(market, selected)
        edge = fair - market_prob if market_prob is not None else None
        band = (clamp(fair - (1 - confidence) / 2), clamp(fair + (1 - confidence) / 2))
        return PricingResult(
            market_id=market.market_id,
            market_type="totals",
            outcome=selected,
            fair_probability=round(fair, 4),
            market_implied_probability=market_prob,
            raw_edge=round(edge, 4) if edge is not None else None,
            confidence=round(confidence, 3),
            confidence_band=(round(band[0], 4), round(band[1], 4)),
            assumptions=[
                "Recent scoring and conceding trends drive expected goals.",
                "A simple Poisson total-goals approximation is used.",
                "No lineup, weather, injury, or live information is included.",
            ],
            reasons=[
                f"Expected goals estimate is {expected_goals:.2f} against a total of {line:g}.",
                f"{home.name} recent GF/GA {recent_goals_for(home):.2f}/{recent_goals_against(home):.2f}; {away.name} recent GF/GA {recent_goals_for(away):.2f}/{recent_goals_against(away):.2f}.",
            ],
            warnings=warnings,
            inputs={
                "home": home.model_dump(),
                "away": away.model_dump(),
                "expected_goals": expected_goals,
                "model_version": MODEL_VERSION,
            },
        )

    @staticmethod
    def _default_moneyline_outcome(market: NormalizedMarket) -> str:
        for label in market.side_labels:
            if label.lower() not in {"draw", "tie"}:
                return label
        return market.home_team or "Home"

    @staticmethod
    def _default_total_outcome(market: NormalizedMarket) -> str:
        for label in market.side_labels:
            if label.lower().startswith("over"):
                return label
        return f"Over {market.line or 2.5:g}"

