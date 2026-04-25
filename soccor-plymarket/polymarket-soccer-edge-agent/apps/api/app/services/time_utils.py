from __future__ import annotations

from datetime import UTC, date, datetime, time
from zoneinfo import ZoneInfo


def app_tz(timezone_name: str) -> ZoneInfo:
    return ZoneInfo(timezone_name)


def as_app_timezone(value: datetime, timezone_name: str) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(app_tz(timezone_name))


def today_bounds_utc(timezone_name: str, target_day: date | None = None) -> tuple[datetime, datetime]:
    tz = app_tz(timezone_name)
    local_day = target_day or datetime.now(tz).date()
    start_local = datetime.combine(local_day, time.min, tzinfo=tz)
    end_local = datetime.combine(local_day, time.max, tzinfo=tz)
    return start_local.astimezone(UTC), end_local.astimezone(UTC)


def is_same_local_day(value: datetime | None, timezone_name: str, target_day: date | None = None) -> bool:
    if value is None:
        return False
    return as_app_timezone(value, timezone_name).date() == (target_day or datetime.now(app_tz(timezone_name)).date())

