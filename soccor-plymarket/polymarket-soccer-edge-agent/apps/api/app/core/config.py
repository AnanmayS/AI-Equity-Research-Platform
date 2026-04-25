from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_mode: str = "demo"
    paper_trading_only: bool = True
    app_timezone: str = "America/New_York"

    database_url: str = "sqlite:///./edge_demo.db"
    redis_url: str = "redis://localhost:6379/0"

    polymarket_gamma_base_url: str = "https://gamma-api.polymarket.com"
    polymarket_gateway_base_url: str = "https://gateway.polymarket.us"
    polymarket_clob_base_url: str = "https://clob.polymarket.com"

    soccer_data_provider: str = "thesportsdb"
    thesportsdb_base_url: str = "https://www.thesportsdb.com/api/v1/json/3"
    apifootball_api_key: str | None = None

    ai_enabled: bool = False
    llm_provider: str = "disabled"
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"

    risk_min_liquidity: float = 250.0
    risk_max_spread: float = 0.12
    risk_minutes_before_start: int = 10
    risk_max_stake: float = 100.0
    risk_max_daily_exposure: float = 500.0
    risk_league_whitelist: str = Field(
        default="Premier League,La Liga,Serie A,Bundesliga,Ligue 1,UEFA Champions League,MLS"
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def league_whitelist(self) -> set[str]:
        return {item.strip() for item in self.risk_league_whitelist.split(",") if item.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
