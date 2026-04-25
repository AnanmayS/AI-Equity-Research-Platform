from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models.db_models import AppSetting, AuditLog
from app.schemas.domain import SettingsPayload
from app.services.app_settings_service import load_ui_settings

router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=SettingsPayload)
def get_app_settings(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> SettingsPayload:
    return load_ui_settings(db, settings)


@router.put("/settings", response_model=SettingsPayload)
def put_app_settings(payload: SettingsPayload, db: Session = Depends(get_db)) -> SettingsPayload:
    row = db.get(AppSetting, "ui")
    if row is None:
        row = AppSetting(key="ui", value=payload.model_dump())
        db.add(row)
    else:
        row.value = payload.model_dump()
    db.add(AuditLog(actor="user", action="settings_updated", payload=payload.model_dump()))
    db.commit()
    return payload
