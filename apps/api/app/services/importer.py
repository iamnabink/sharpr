"""Imports the external-agent JSON/CSV format into a user's library."""

from __future__ import annotations

import csv
import io
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ids import new_id, now_ms
from app.models.content import Collection, CollectionItem, Content, ContentResource, Resource
from app.models.learning import Book, VocabularyItem
from app.schemas.importing import DEFAULT_DURATION_SECONDS, ImportContent, ImportFile, ImportSummary

ARRAY_COLUMNS = {"tags", "guiding_questions", "audiences", "discussion_points", "follow_up_questions"}
NUMBER_COLUMNS = {"duration", "duration_seconds", "preparation_seconds"}


def parse_json(text: str) -> ImportFile:
    data = json.loads(text)
    if isinstance(data, list):
        data = {"content": data}
    return ImportFile.model_validate(data)


def parse_csv(text: str) -> ImportFile:
    reader = csv.DictReader(io.StringIO(text))
    items: list[dict[str, Any]] = []
    for row in reader:
        obj: dict[str, Any] = {}
        for k, v in row.items():
            if k is None or v is None or v == "":
                continue
            key = k.strip()
            if key in ARRAY_COLUMNS:
                obj[key] = [s.strip() for s in v.split("|") if s.strip()]
            elif key in NUMBER_COLUMNS:
                obj[key] = float(v)
            else:
                obj[key] = v
        items.append(obj)
    return ImportFile.model_validate({"content": items})


def _content_row(user_id: str, raw: ImportContent, source: str) -> Content:
    ts = now_ms()
    duration = (
        raw.duration_seconds
        if raw.duration_seconds is not None
        else int(raw.duration * 60) if raw.duration is not None else DEFAULT_DURATION_SECONDS.get(raw.type, 180)
    )
    data: dict[str, Any] = {}
    pairs = {
        "guidingQuestions": raw.guiding_questions,
        "modelAnswerNotes": raw.model_answer_notes,
        "framework": raw.framework,
        "audiences": raw.audiences,
        "openingQuestion": raw.opening_question,
        "discussionPoints": raw.discussion_points,
        "followUpQuestions": raw.follow_up_questions,
        "controversialAngle": raw.controversial_angle,
        "closingQuestion": raw.closing_question,
        "position": raw.position,
        "counterarguments": [c.model_dump() for c in raw.counterarguments] if raw.counterarguments else None,
        "role": raw.role,
        "situation": raw.situation,
        "learning": (
            {
                "short": raw.learning.short,
                "detailed": raw.learning.detailed,
                "keyPoints": raw.learning.key_points,
                "examples": raw.learning.examples,
                "commonMistakes": raw.learning.common_mistakes,
                "interviewQuestions": raw.learning.interview_questions,
                "relatedTopics": raw.learning.related_topics,
            }
            if raw.learning
            else None
        ),
    }
    for k, v in pairs.items():
        if v is not None:
            data[k] = v
    return Content(
        id=new_id(),
        user_id=user_id,
        type=raw.type,
        title=raw.title.strip(),
        prompt=raw.prompt.strip(),
        category=raw.category.strip() or "General",
        subcategory=raw.subcategory,
        difficulty=raw.difficulty,
        duration_seconds=duration,
        preparation_seconds=raw.preparation_seconds,
        tags=[t.lower().strip() for t in raw.tags if t.strip()],
        status="active",
        bookmarked=False,
        source=source,
        track=raw.track,
        data=data,
        created_at=ts,
        updated_at=ts,
    )


async def import_file(db: AsyncSession, user_id: str, file: ImportFile, source: str, skip_duplicates: bool = True) -> ImportSummary:
    summary = ImportSummary()
    ts = now_ms()

    existing = (await db.execute(select(Content).where(Content.user_id == user_id))).scalars().all()
    by_key: dict[str, Content] = {f"{c.type}::{c.title.lower()}": c for c in existing}
    existing_words = {v.word.lower() for v in (await db.execute(select(VocabularyItem).where(VocabularyItem.user_id == user_id))).scalars().all()}
    existing_collections = (await db.execute(select(Collection).where(Collection.user_id == user_id))).scalars().all()
    existing_col_items: dict[str, set[str]] = {}
    for col in existing_collections:
        existing_col_items[col.id] = set((await db.execute(select(CollectionItem.content_id).where(CollectionItem.collection_id == col.id))).scalars().all())
    existing_books = {b.title.lower() for b in (await db.execute(select(Book).where(Book.user_id == user_id))).scalars().all()}

    new_content: list[Content] = []
    links: list[tuple[str, str]] = []  # (content_id, resource_id)

    def make_resource(r) -> Resource:
        return Resource(
            id=new_id(), user_id=user_id, type=r.type or "article", title=r.title, url=r.url, author=r.author, description=r.description,
            body=r.body, tags=[t.lower() for t in r.tags], completed=False, created_at=ts, updated_at=ts,
        )

    with db.no_autoflush:
        # phase 1: content + resources
        for raw in file.content:
            key = f"{raw.type}::{raw.title.strip().lower()}"
            if skip_duplicates and key in by_key:
                summary.skipped_duplicates += 1
                continue
            row = _content_row(user_id, raw, source)
            db.add(row)
            new_content.append(row)
            by_key[key] = row
            for r in raw.resources:
                res = make_resource(r)
                db.add(res)
                links.append((row.id, res.id))
                summary.resources += 1
        summary.content = len(new_content)

        for r in file.resources:
            res = make_resource(r)
            db.add(res)
            summary.resources += 1
            for t in r.topics:
                for k, c in by_key.items():
                    if k.endswith(f"::{t.lower()}"):
                        links.append((c.id, res.id))
        await db.flush()

        # phase 2: links + vocabulary
        for cid, rid in links:
            db.add(ContentResource(content_id=cid, resource_id=rid))
        for v in file.vocabulary:
            if skip_duplicates and v.word.lower() in existing_words:
                summary.skipped_duplicates += 1
                continue
            db.add(
                VocabularyItem(
                    id=new_id(), user_id=user_id, word=v.word, meaning=v.meaning, example=v.example, pronunciation=v.pronunciation,
                    synonyms=v.synonyms, category=v.category, discovered_in=v.discovered_in, personal_example=v.personal_example,
                    times_used=0, created_at=ts, updated_at=ts,
                )
            )
            existing_words.add(v.word.lower())
            summary.vocabulary += 1
        await db.flush()

        # phase 3: collections
        all_content = list(by_key.values())
        pending_items: list[tuple[str, str, int]] = []
        for c in file.collections:
            ids: list[str] = []
            for it in c.items:
                if it.lower().startswith("tag:"):
                    tag = it[4:].lower()
                    ids.extend(x.id for x in all_content if tag in (x.tags or []))
                else:
                    ids.extend(x.id for x in all_content if x.title.lower() == it.lower())
            ids = list(dict.fromkeys(ids))
            found = next((x for x in existing_collections if x.name.lower() == c.name.lower()), None)
            if found:
                current = existing_col_items.get(found.id, set())
                for i, cid in enumerate(ids):
                    if cid not in current:
                        pending_items.append((found.id, cid, len(current) + i))
                found.updated_at = ts
            else:
                col = Collection(id=new_id(), user_id=user_id, name=c.name, description=c.description, created_at=ts, updated_at=ts)
                db.add(col)
                for i, cid in enumerate(ids):
                    pending_items.append((col.id, cid, i))
            summary.collections += 1
        await db.flush()
        for col_id, cid, pos in pending_items:
            db.add(CollectionItem(collection_id=col_id, content_id=cid, position=pos))

        # phase 4: books
        for b in file.books:
            if skip_duplicates and b.title.lower() in existing_books:
                summary.skipped_duplicates += 1
                continue
            db.add(
                Book(
                    id=new_id(), user_id=user_id, title=b.title, author=b.author, status=b.status, total_chapters=b.total_chapters,
                    current_chapter=b.current_chapter, pages_read=0, notes=b.notes, ideas=b.ideas, quotes=b.quotes, concepts=b.concepts,
                    vocabulary=b.vocabulary, prompts=b.prompts, created_at=ts, updated_at=ts,
                )
            )
            existing_books.add(b.title.lower())
            summary.books += 1

    await db.commit()
    return summary
