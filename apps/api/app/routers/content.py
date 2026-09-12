from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.ids import new_id, now_ms
from app.core.security import get_current_user
from app.models.content import CollectionItem, Content, ContentResource
from app.models.practice import RetryItem
from app.models.user import User
from app.routers.deps import get_owned
from app.schemas.content import BulkAction, ContentCreate, ContentOut, ContentUpdate
from app.services.content_mapper import apply_payload, to_out

router = APIRouter(prefix="/content", tags=["content"])


async def _resource_map(db: AsyncSession, content_ids: list[str]) -> dict[str, list[str]]:
    if not content_ids:
        return {}
    rows = (await db.execute(select(ContentResource).where(ContentResource.content_id.in_(content_ids)))).scalars().all()
    m: dict[str, list[str]] = {}
    for r in rows:
        m.setdefault(r.content_id, []).append(r.resource_id)
    return m


async def _out(db: AsyncSession, row: Content) -> ContentOut:
    m = await _resource_map(db, [row.id])
    return to_out(row, m.get(row.id, []))


@router.get("", response_model=list[ContentOut])
async def list_content(
    type: list[str] | None = Query(default=None),
    status: str | None = "active",
    category: str | None = None,
    track: str | None = None,
    tag: str | None = None,
    difficulty: str | None = None,
    bookmarked: bool | None = None,
    book_id: str | None = Query(default=None, alias="bookId"),
    q: str | None = None,
    limit: int = 5000,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Content).where(Content.user_id == user.id)
    if status and status != "all":
        stmt = stmt.where(Content.status == status)
    if type:
        stmt = stmt.where(Content.type.in_(type))
    if track:
        stmt = stmt.where(Content.track == track)
    if difficulty:
        stmt = stmt.where(Content.difficulty == difficulty)
    if bookmarked is not None:
        stmt = stmt.where(Content.bookmarked.is_(bookmarked))
    if book_id:
        stmt = stmt.where(Content.book_id == book_id)
    if tag:
        stmt = stmt.where(Content.tags.any(tag.lower()))
    if category:
        stmt = stmt.where(or_(Content.category.ilike(f"%{category}%"), Content.subcategory.ilike(f"%{category}%")))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Content.title.ilike(like), Content.prompt.ilike(like), Content.category.ilike(like)))
    stmt = stmt.order_by(Content.updated_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    m = await _resource_map(db, [r.id for r in rows])
    return [to_out(r, m.get(r.id, [])) for r in rows]


@router.post("", response_model=ContentOut, status_code=201)
async def create_content(body: ContentCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    ts = now_ms()
    row = Content(id=new_id(), user_id=user.id, type=body.type, title=body.title, prompt=body.prompt, created_at=ts, updated_at=ts, data={})
    apply_payload(row, body.model_dump(by_alias=True, exclude_none=True))
    db.add(row)
    await db.commit()
    return await _out(db, row)


@router.get("/{content_id}", response_model=ContentOut)
async def get_content(content_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, Content, content_id, user.id)
    return await _out(db, row)


@router.patch("/{content_id}", response_model=ContentOut)
async def update_content(content_id: str, body: ContentUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, Content, content_id, user.id)
    payload = body.model_dump(by_alias=True, exclude_unset=True)
    resource_ids = payload.pop("resourceIds", None)
    apply_payload(row, payload)
    row.updated_at = now_ms()
    if resource_ids is not None:
        await db.execute(delete(ContentResource).where(ContentResource.content_id == row.id))
        for rid in resource_ids:
            db.add(ContentResource(content_id=row.id, resource_id=rid))
    await db.commit()
    return await _out(db, row)


@router.delete("/{content_id}", status_code=204)
async def delete_content(content_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, Content, content_id, user.id)
    await db.execute(delete(RetryItem).where(RetryItem.content_id == row.id))
    await db.execute(delete(CollectionItem).where(CollectionItem.content_id == row.id))
    await db.delete(row)
    await db.commit()


@router.post("/{content_id}/duplicate", response_model=ContentOut, status_code=201)
async def duplicate_content(content_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, Content, content_id, user.id)
    ts = now_ms()
    copy = Content(
        id=new_id(), user_id=user.id, type=row.type, title=f"{row.title} (copy)", prompt=row.prompt, category=row.category,
        subcategory=row.subcategory, difficulty=row.difficulty, duration_seconds=row.duration_seconds,
        preparation_seconds=row.preparation_seconds, tags=list(row.tags or []), status="active", bookmarked=False, source="manual",
        track=row.track, book_id=row.book_id, data=dict(row.data or {}), created_at=ts, updated_at=ts,
    )
    db.add(copy)
    await db.commit()
    return await _out(db, copy)


@router.post("/bulk")
async def bulk(body: BulkAction, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(Content).where(Content.user_id == user.id, Content.id.in_(body.ids)))).scalars().all()
    ts = now_ms()
    for row in rows:
        if body.action == "archive":
            row.status = "archived"
        elif body.action == "unarchive":
            row.status = "active"
        elif body.action == "bookmark":
            row.bookmarked = True
        elif body.action == "unbookmark":
            row.bookmarked = False
        elif body.action == "delete":
            await db.execute(delete(RetryItem).where(RetryItem.content_id == row.id))
            await db.delete(row)
            continue
        elif body.action == "duplicate":
            db.add(
                Content(
                    id=new_id(), user_id=user.id, type=row.type, title=f"{row.title} (copy)", prompt=row.prompt, category=row.category,
                    subcategory=row.subcategory, difficulty=row.difficulty, duration_seconds=row.duration_seconds,
                    preparation_seconds=row.preparation_seconds, tags=list(row.tags or []), status="active", bookmarked=False,
                    source="manual", track=row.track, book_id=row.book_id, data=dict(row.data or {}), created_at=ts, updated_at=ts,
                )
            )
            continue
        row.updated_at = ts
    await db.commit()
    return {"affected": len(rows)}
