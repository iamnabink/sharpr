"""Converts between the flat API shape and the Content row (typed columns + JSONB `data`)."""

from __future__ import annotations

from app.models.content import Content
from app.schemas.content import DATA_KEYS, ContentOut

COLUMN_FIELDS = {
    "type", "title", "prompt", "category", "subcategory", "difficulty", "durationSeconds", "preparationSeconds",
    "tags", "status", "bookmarked", "source", "track", "bookId",
}
SNAKE = {
    "durationSeconds": "duration_seconds", "preparationSeconds": "preparation_seconds", "bookId": "book_id",
}


def apply_payload(row: Content, payload: dict) -> None:
    """payload is camelCase dict of set fields (exclude_unset)."""
    for k, v in payload.items():
        if k in ("resourceIds", "id", "createdAt", "updatedAt"):
            continue
        if k == "bookmarked":
            row.bookmarked = bool(v)
        elif k == "tags":
            row.tags = [t.lower().strip() for t in (v or []) if t and t.strip()]
        elif k in COLUMN_FIELDS:
            setattr(row, SNAKE.get(k, k), v)
        elif k in DATA_KEYS:
            data = dict(row.data or {})
            if v is None:
                data.pop(k, None)
            else:
                data[k] = v
            row.data = data


def to_out(row: Content, resource_ids: list[str]) -> ContentOut:
    d = {
        "id": row.id,
        "type": row.type,
        "title": row.title,
        "prompt": row.prompt,
        "category": row.category,
        "subcategory": row.subcategory,
        "difficulty": row.difficulty,
        "durationSeconds": row.duration_seconds,
        "preparationSeconds": row.preparation_seconds,
        "tags": row.tags or [],
        "status": row.status,
        "bookmarked": 1 if row.bookmarked else 0,
        "source": row.source,
        "track": row.track,
        "bookId": row.book_id,
        "resourceIds": resource_ids,
        "createdAt": row.created_at,
        "updatedAt": row.updated_at,
        **(row.data or {}),
    }
    return ContentOut.model_validate(d)
