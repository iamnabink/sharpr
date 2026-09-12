"""Deterministic, weighted random selection. No AI. Mirrors the rules documented in docs/ARCHITECTURE.md."""

from __future__ import annotations

import random
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ids import now_ms
from app.models.content import CollectionItem, Content
from app.models.practice import Attempt, RetryItem

DAY_MS = 86_400_000


@dataclass
class RandomFilter:
    types: list[str] | None = None
    category: str | None = None
    tags: list[str] | None = None
    difficulty: list[str] | None = None
    min_duration: int | None = None
    max_duration: int | None = None
    track: str | None = None
    only_bookmarked: bool = False
    only_never_practiced: bool = False
    only_low_rated: bool = False
    only_retry_queue: bool = False
    collection_id: str | None = None
    book_id: str | None = None
    exclude: list[str] = field(default_factory=list)


@dataclass
class History:
    last: dict[str, int]
    count: dict[str, int]
    rating: dict[str, float]
    retry_due: set[str]


async def build_history(db: AsyncSession, user_id: str) -> History:
    attempts = (await db.execute(select(Attempt).where(Attempt.user_id == user_id).order_by(Attempt.completed_at))).scalars().all()
    h = History({}, {}, {}, set())
    for a in attempts:
        if not a.content_id:
            continue
        h.last[a.content_id] = a.completed_at
        h.count[a.content_id] = h.count.get(a.content_id, 0) + 1
        if a.review and a.review.get("overall") is not None:
            h.rating[a.content_id] = float(a.review["overall"])
    t = now_ms()
    retries = (await db.execute(select(RetryItem).where(RetryItem.user_id == user_id, RetryItem.status == "pending"))).scalars().all()
    for r in retries:
        if r.due_at <= t:
            h.retry_due.add(r.content_id)
    return h


def matches(c: Content, f: RandomFilter, collection_ids: set[str] | None) -> bool:
    if c.status != "active" or c.id in f.exclude:
        return False
    if f.types and c.type not in f.types:
        return False
    if f.track and c.track != f.track:
        return False
    if f.book_id and c.book_id != f.book_id:
        return False
    if f.difficulty and c.difficulty not in f.difficulty:
        return False
    if f.min_duration is not None and c.duration_seconds < f.min_duration:
        return False
    if f.max_duration is not None and c.duration_seconds > f.max_duration:
        return False
    if f.only_bookmarked and not c.bookmarked:
        return False
    if collection_ids is not None and c.id not in collection_ids:
        return False
    if f.category:
        hay = " ".join([c.category, c.subcategory or "", c.track or "", *c.tags]).lower()
        if f.category.lower() not in hay:
            return False
    return not (f.tags and not any(t.lower() in c.tags for t in f.tags))


def score(c: Content, h: History) -> tuple[float, list[str]]:
    w = 1.0
    reasons: list[str] = []
    last = h.last.get(c.id)
    if last is None:
        w *= 3
        reasons.append("never practiced")
    else:
        days = (now_ms() - last) / DAY_MS
        if days < 7:
            w *= 0.15
        elif days < 30:
            w *= 0.15 + ((days - 7) / 23) * 0.85
        else:
            w *= 1.3
            reasons.append("not practiced in a month")
    if c.id in h.retry_due:
        w *= 4
        reasons.append("in retry queue")
    r = h.rating.get(c.id)
    if r is not None and r < 6:
        w *= 2.5
        reasons.append(f"last rated {r:g}/10")
    if c.bookmarked:
        w *= 1.5
        reasons.append("bookmarked")
    return w, reasons


async def candidates(db: AsyncSession, user_id: str, f: RandomFilter) -> list[tuple[Content, float, list[str]]]:
    h = await build_history(db, user_id)
    collection_ids: set[str] | None = None
    if f.collection_id:
        rows = (await db.execute(select(CollectionItem.content_id).where(CollectionItem.collection_id == f.collection_id))).scalars().all()
        collection_ids = set(rows)
    q = select(Content).where(Content.user_id == user_id, Content.status == "active")
    if f.types:
        q = q.where(Content.type.in_(f.types))
    items = (await db.execute(q)).scalars().all()
    out = []
    for c in items:
        if not matches(c, f, collection_ids):
            continue
        if f.only_never_practiced and c.id in h.last:
            continue
        if f.only_low_rated and h.rating.get(c.id, 10) >= 6:
            continue
        if f.only_retry_queue and c.id not in h.retry_due:
            continue
        w, reasons = score(c, h)
        out.append((c, w, reasons))
    return out


def weighted_pick(items: list[tuple[Content, float, list[str]]]):
    if not items:
        return None
    total = sum(w for _, w, _ in items)
    r = random.random() * total
    for it in items:
        r -= it[1]
        if r <= 0:
            return it
    return items[-1]


async def pick_many(db: AsyncSession, user_id: str, f: RandomFilter, n: int):
    pool = await candidates(db, user_id, f)
    out = []
    while pool and len(out) < n:
        p = weighted_pick(pool)
        out.append(p)
        pool.remove(p)
    return out
