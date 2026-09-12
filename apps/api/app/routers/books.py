from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.ids import new_id, now_ms
from app.core.security import get_current_user
from app.models.learning import Book
from app.models.user import User
from app.routers.deps import apply_updates, get_owned
from app.schemas.learning import BookCreate, BookOut, BookUpdate

router = APIRouter(prefix="/books", tags=["books"])


@router.get("", response_model=list[BookOut])
async def list_books(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(Book).where(Book.user_id == user.id).order_by(Book.updated_at.desc()))).scalars().all()
    return [BookOut.model_validate(r) for r in rows]


@router.post("", response_model=BookOut, status_code=201)
async def create_book(body: BookCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    ts = now_ms()
    row = Book(id=new_id(), user_id=user.id, created_at=ts, updated_at=ts, **body.model_dump())
    db.add(row)
    await db.commit()
    return BookOut.model_validate(row)


@router.get("/{book_id}", response_model=BookOut)
async def get_book(book_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return BookOut.model_validate(await get_owned(db, Book, book_id, user.id))


@router.patch("/{book_id}", response_model=BookOut)
async def update_book(book_id: str, body: BookUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, Book, book_id, user.id)
    apply_updates(row, body)
    row.updated_at = now_ms()
    await db.commit()
    return BookOut.model_validate(row)


@router.delete("/{book_id}", status_code=204)
async def delete_book(book_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, Book, book_id, user.id)
    await db.delete(row)
    await db.commit()
