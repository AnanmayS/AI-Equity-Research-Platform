from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.services.risk_engine import risk_status

router = APIRouter(tags=["risk"])


@router.get("/risk/status")
def get_risk_status(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    return risk_status(db, settings)

