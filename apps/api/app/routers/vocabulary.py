from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.ids import new_id, now_ms
from app.core.security import get_current_user
from app.models.learning import VocabularyItem
from app.models.user import User
from app.routers.deps import apply_updates, get_owned
from app.schemas.learning import VocabularyCreate, VocabularyOut, VocabularyUpdate

router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])


@router.get("", response_model=list[VocabularyOut])
async def list_vocabulary(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(VocabularyItem).where(VocabularyItem.user_id == user.id).order_by(VocabularyItem.created_at.desc()))).scalars().all()
    return [VocabularyOut.model_validate(r) for r in rows]


@router.post("", response_model=VocabularyOut, status_code=201)
async def create_vocabulary(body: VocabularyCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    ts = now_ms()
    row = VocabularyItem(id=new_id(), user_id=user.id, times_used=0, created_at=ts, updated_at=ts, **body.model_dump())
    db.add(row)
    await db.commit()
    return VocabularyOut.model_validate(row)


@router.patch("/{item_id}", response_model=VocabularyOut)
async def update_vocabulary(item_id: str, body: VocabularyUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, VocabularyItem, item_id, user.id)
    apply_updates(row, body)
    row.updated_at = now_ms()
    await db.commit()
    return VocabularyOut.model_validate(row)


@router.delete("/{item_id}", status_code=204)
async def delete_vocabulary(item_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, VocabularyItem, item_id, user.id)
    await db.delete(row)
    await db.commit()
