from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.practice import Setting
from app.models.user import User
from app.schemas.practice import SettingIn

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
async def get_settings_all(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    rows = (await db.execute(select(Setting).where(Setting.user_id == user.id))).scalars().all()
    return {r.key: (r.value or {}).get("v") for r in rows}


@router.put("/{key}")
async def put_setting(key: str, body: SettingIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = (await db.execute(select(Setting).where(Setting.user_id == user.id, Setting.key == key))).scalar_one_or_none()
    if row:
        row.value = {"v": body.value}
    else:
        db.add(Setting(user_id=user.id, key=key, value={"v": body.value}))
    await db.commit()
    return {key: body.value}
