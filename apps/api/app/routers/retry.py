from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.ids import new_id, now_ms
from app.core.security import get_current_user
from app.models.practice import RetryItem
from app.models.user import User
from app.routers.deps import apply_updates, get_owned
from app.schemas.practice import RetryCreate, RetryOut, RetryUpdate

router = APIRouter(prefix="/retry", tags=["retry"])


@router.get("", response_model=list[RetryOut])
async def list_retry(status: str | None = "pending", db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(RetryItem).where(RetryItem.user_id == user.id)
    if status and status != "all":
        stmt = stmt.where(RetryItem.status == status)
    rows = (await db.execute(stmt.order_by(RetryItem.due_at))).scalars().all()
    return [RetryOut.model_validate(r) for r in rows]


@router.post("", response_model=RetryOut, status_code=201)
async def add_retry(body: RetryCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    existing = (
        await db.execute(select(RetryItem).where(RetryItem.user_id == user.id, RetryItem.content_id == body.content_id, RetryItem.status == "pending"))
    ).scalar_one_or_none()
    if existing:
        existing.due_at = body.due_at
        existing.reason = body.reason or existing.reason
        existing.attempt_id = body.attempt_id or existing.attempt_id
        await db.commit()
        return RetryOut.model_validate(existing)
    row = RetryItem(id=new_id(), user_id=user.id, content_id=body.content_id, attempt_id=body.attempt_id, reason=body.reason, due_at=body.due_at, status="pending", created_at=now_ms())
    db.add(row)
    await db.commit()
    return RetryOut.model_validate(row)


@router.patch("/{retry_id}", response_model=RetryOut)
async def update_retry(retry_id: str, body: RetryUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, RetryItem, retry_id, user.id)
    apply_updates(row, body)
    await db.commit()
    return RetryOut.model_validate(row)


@router.delete("/{retry_id}", status_code=204)
async def delete_retry(retry_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, RetryItem, retry_id, user.id)
    await db.delete(row)
    await db.commit()
