from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.ids import now_ms
from app.core.security import get_current_user
from app.engine.random_engine import RandomFilter, candidates, pick_many, weighted_pick
from app.engine.stats import compute_stats, goal_progress
from app.models.content import Content
from app.models.learning import Book
from app.models.practice import Attempt, Goal, RetryItem, Setting
from app.models.user import User
from app.routers.content import _resource_map
from app.services.content_mapper import to_out

router = APIRouter(tags=["engine"])


def _filter(
    types: list[str] | None = Query(default=None, alias="type"),
    category: str | None = None,
    tags: list[str] | None = Query(default=None, alias="tag"),
    difficulty: list[str] | None = Query(default=None),
    min_duration: int | None = Query(default=None, alias="minDuration"),
    max_duration: int | None = Query(default=None, alias="maxDuration"),
    track: str | None = None,
    only_bookmarked: bool = Query(default=False, alias="onlyBookmarked"),
    only_never_practiced: bool = Query(default=False, alias="onlyNeverPracticed"),
    only_low_rated: bool = Query(default=False, alias="onlyLowRated"),
    only_retry_queue: bool = Query(default=False, alias="onlyRetryQueue"),
    collection_id: str | None = Query(default=None, alias="collectionId"),
    book_id: str | None = Query(default=None, alias="bookId"),
    exclude: list[str] | None = Query(default=None),
) -> RandomFilter:
    return RandomFilter(
        types=types, category=category, tags=tags, difficulty=difficulty, min_duration=min_duration, max_duration=max_duration, track=track,
        only_bookmarked=only_bookmarked, only_never_practiced=only_never_practiced, only_low_rated=only_low_rated,
        only_retry_queue=only_retry_queue, collection_id=collection_id, book_id=book_id, exclude=exclude or [],
    )


async def _pick_out(db, picks):
    ids = [p[0].id for p in picks]
    m = await _resource_map(db, ids)
    return [{"item": to_out(c, m.get(c.id, [])), "weight": w, "reasons": reasons} for c, w, reasons in picks]


@router.get("/random")
async def random_one(f: RandomFilter = Depends(_filter), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    pool = await candidates(db, user.id, f)
    pick = weighted_pick(pool)
    out = await _pick_out(db, [pick]) if pick else []
    return {"pick": out[0] if out else None, "candidates": len(pool)}


@router.get("/random/many")
async def random_many(n: int = 5, f: RandomFilter = Depends(_filter), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    picks = await pick_many(db, user.id, f, n)
    return await _pick_out(db, picks)


@router.get("/daily")
async def daily(
    slot: str, date: str, f: RandomFilter = Depends(_filter), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    """Stable pick per slot per local day (client passes its local date string)."""
    key = f"daily:{slot}:{date}"
    row = (await db.execute(select(Setting).where(Setting.user_id == user.id, Setting.key == key))).scalar_one_or_none()
    if row:
        cid = (row.value or {}).get("v")
        c = (await db.execute(select(Content).where(Content.id == cid, Content.user_id == user.id, Content.status == "active"))).scalar_one_or_none()
        if c:
            m = await _resource_map(db, [c.id])
            return {"item": to_out(c, m.get(c.id, []))}
    pick = weighted_pick(await candidates(db, user.id, f))
    if not pick:
        return {"item": None}
    if row:
        row.value = {"v": pick[0].id}
    else:
        db.add(Setting(user_id=user.id, key=key, value={"v": pick[0].id}))
    await db.commit()
    m = await _resource_map(db, [pick[0].id])
    return {"item": to_out(pick[0], m.get(pick[0].id, []))}


@router.get("/stats")
async def stats(tz_offset: int = Query(default=0, alias="tzOffset"), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    attempts = (await db.execute(select(Attempt).where(Attempt.user_id == user.id))).scalars().all()
    retried = set((await db.execute(select(RetryItem.content_id).where(RetryItem.user_id == user.id))).scalars().all())
    goals = (await db.execute(select(Goal).where(Goal.user_id == user.id).order_by(Goal.created_at))).scalars().all()
    books = (await db.execute(select(Book).where(Book.user_id == user.id))).scalars().all()
    pages = sum(b.pages_read for b in books)
    t = now_ms()
    return {
        "stats": compute_stats(list(attempts), retried, t, tz_offset),
        "goals": [goal_progress(g, list(attempts), pages, t, tz_offset) for g in goals],
        "pagesRead": pages,
        "books": len(books),
    }
