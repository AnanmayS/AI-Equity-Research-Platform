from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.db_models import AppSetting
from app.schemas.domain import SettingsPayload


def load_ui_settings(db: Session, runtime_settings: Settings) -> SettingsPayload:
    row = db.get(AppSetting, "ui")
    if row:
        return SettingsPayload(**row.value)
    return SettingsPayload(
        ai_enabled=runtime_settings.ai_enabled,
        llm_provider=runtime_settings.llm_provider,
        soccer_data_provider=runtime_settings.soccer_data_provider,
        risk={
            "min_liquidity": runtime_settings.risk_min_liquidity,
            "max_spread": runtime_settings.risk_max_spread,
            "max_stake": runtime_settings.risk_max_stake,
            "max_daily_exposure": runtime_settings.risk_max_daily_exposure,
        },
    )

