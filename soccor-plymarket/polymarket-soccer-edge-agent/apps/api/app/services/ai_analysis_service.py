from __future__ import annotations

from abc import ABC, abstractmethod

import httpx

from app.core.config import Settings
from app.schemas.domain import AgentExplanation, NormalizedMarket, PricingResult


SYSTEM_STYLE = (
    "You are a conservative soccer prediction-market analyst. Use only the numbers supplied. "
    "Do not invent probabilities, odds, liquidity, injuries, or compliance advice. "
    "Prefer no trade when edge or confidence is weak. Never suggest a real order."
)


class LLMProvider(ABC):
    name: str

    @abstractmethod
    async def explain(self, market: NormalizedMarket, pricing: PricingResult) -> str:
        raise NotImplementedError


def deterministic_explanation(market: NormalizedMarket, pricing: PricingResult) -> str:
    edge_text = (
        f"{pricing.raw_edge:+.1%} raw edge"
        if pricing.raw_edge is not None
        else "no reliable market-implied probability"
    )
    implied_text = (
        f"{pricing.market_implied_probability:.1%}"
        if pricing.market_implied_probability is not None
        else "unavailable"
    )
    risk_note = " ".join(pricing.warnings) if pricing.warnings else "No major model warnings surfaced."
    stance = "watchlist"
    if pricing.raw_edge is not None and pricing.raw_edge > 0.04 and pricing.confidence >= 0.55:
        stance = "paper-trade candidate"
    elif pricing.raw_edge is not None and pricing.raw_edge < 0.015:
        stance = "no trade"
    return (
        f"{stance.upper()}: {market.question}\n"
        f"Fair probability for {pricing.outcome}: {pricing.fair_probability:.1%}. "
        f"Market implied probability: {implied_text}. "
        f"That leaves {edge_text} with confidence {pricing.confidence:.0%}.\n"
        f"Why: {' '.join(pricing.reasons)}\n"
        f"Risk notes: {risk_note}\n"
        "This is paper-only analysis and not a real-money order instruction."
    )


class DisabledProvider(LLMProvider):
    name = "disabled"

    async def explain(self, market: NormalizedMarket, pricing: PricingResult) -> str:
        return deterministic_explanation(market, pricing)


class GeminiProvider(LLMProvider):
    name = "gemini"

    def __init__(self, settings: Settings):
        self.api_key = settings.gemini_api_key

    async def explain(self, market: NormalizedMarket, pricing: PricingResult) -> str:
        if not self.api_key:
            return deterministic_explanation(market, pricing)
        prompt = build_prompt(market, pricing)
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-1.5-flash:generateContent?key={self.api_key}"
        )
        payload = {"contents": [{"parts": [{"text": f"{SYSTEM_STYLE}\n\n{prompt}"}]}]}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


class OpenRouterProvider(LLMProvider):
    name = "openrouter"

    def __init__(self, settings: Settings):
        self.api_key = settings.openrouter_api_key

    async def explain(self, market: NormalizedMarket, pricing: PricingResult) -> str:
        if not self.api_key:
            return deterministic_explanation(market, pricing)
        payload = {
            "model": "meta-llama/llama-3.1-8b-instruct:free",
            "messages": [
                {"role": "system", "content": SYSTEM_STYLE},
                {"role": "user", "content": build_prompt(market, pricing)},
            ],
        }
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
        return data["choices"][0]["message"]["content"]


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(self, settings: Settings):
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_model

    async def explain(self, market: NormalizedMarket, pricing: PricingResult) -> str:
        payload = {
            "model": self.model,
            "stream": False,
            "prompt": f"{SYSTEM_STYLE}\n\n{build_prompt(market, pricing)}",
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                response.raise_for_status()
                data = response.json()
            return data.get("response", deterministic_explanation(market, pricing))
        except httpx.HTTPError:
            return deterministic_explanation(market, pricing)


def build_prompt(market: NormalizedMarket, pricing: PricingResult) -> str:
    return (
        f"Market: {market.question}\n"
        f"League: {market.league}; kickoff: {market.start_time}; type: {market.market_type}\n"
        f"Outcome: {pricing.outcome}\n"
        f"Fair probability: {pricing.fair_probability}\n"
        f"Market implied probability: {pricing.market_implied_probability}\n"
        f"Raw edge: {pricing.raw_edge}\n"
        f"Confidence: {pricing.confidence}; band: {pricing.confidence_band}\n"
        f"Reasons: {pricing.reasons}\n"
        f"Assumptions: {pricing.assumptions}\n"
        f"Warnings: {pricing.warnings}\n"
        "Write a concise thesis with a conservative stance: trade candidate, watchlist, or no trade."
    )


def build_provider(settings: Settings) -> LLMProvider:
    if not settings.ai_enabled or settings.llm_provider == "disabled":
        return DisabledProvider()
    if settings.llm_provider == "gemini":
        return GeminiProvider(settings)
    if settings.llm_provider == "openrouter":
        return OpenRouterProvider(settings)
    if settings.llm_provider == "ollama":
        return OllamaProvider(settings)
    return DisabledProvider()


class AIAnalysisService:
    def __init__(self, settings: Settings):
        self.provider = build_provider(settings)

    async def explain(self, market: NormalizedMarket, pricing: PricingResult) -> AgentExplanation:
        text = await self.provider.explain(market, pricing)
        return AgentExplanation(
            market_id=market.market_id,
            provider=self.provider.name,
            text=text,
            deterministic_only=self.provider.name == "disabled",
        )
