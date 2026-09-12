from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.ids import new_id, now_ms
from app.core.security import get_current_user
from app.models.learning import Note
from app.models.user import User
from app.routers.deps import apply_updates, get_owned
from app.schemas.learning import NoteCreate, NoteOut, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=list[NoteOut])
async def list_notes(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(Note).where(Note.user_id == user.id).order_by(Note.updated_at.desc()))).scalars().all()
    return [NoteOut.model_validate(r) for r in rows]


@router.post("", response_model=NoteOut, status_code=201)
async def create_note(body: NoteCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    ts = now_ms()
    row = Note(id=new_id(), user_id=user.id, created_at=ts, updated_at=ts, **body.model_dump())
    db.add(row)
    await db.commit()
    return NoteOut.model_validate(row)


@router.patch("/{note_id}", response_model=NoteOut)
async def update_note(note_id: str, body: NoteUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, Note, note_id, user.id)
    apply_updates(row, body)
    row.updated_at = now_ms()
    await db.commit()
    return NoteOut.model_validate(row)


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, Note, note_id, user.id)
    await db.delete(row)
    await db.commit()
