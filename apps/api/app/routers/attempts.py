import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_db
from app.core.ids import new_id, now_ms
from app.core.security import get_current_user
from app.models.content import Content
from app.models.learning import VocabularyItem
from app.models.practice import Attempt, Recording, RetryItem
from app.models.user import User
from app.routers.deps import get_owned
from app.schemas.practice import AttemptCreate, AttemptOut, AttemptUpdate, HistoryEntry, RecordingOut
from app.services.storage import get_storage, storage_key

router = APIRouter(tags=["attempts"])

RATING_DIMENSIONS = [
    "fluency", "confidence", "clarity", "vocabulary", "grammar", "pronunciation", "conciseness", "organization",
    "knowledge", "storytelling", "persuasiveness", "technicalAccuracy",
]


def _out(a: Attempt) -> AttemptOut:
    return AttemptOut(
        id=a.id, content_id=a.content_id, content_type=a.content_type, content_title=a.content_title, category=a.category,
        difficulty=a.difficulty, variant=a.variant, pass_=a.pass_number, recording_kind=a.recording_kind, recording_id=a.recording_id,
        duration_seconds=a.duration_seconds, started_at=a.started_at, completed_at=a.completed_at, review=a.review,
        vocabulary_ids=a.vocabulary_ids or [], session_run_id=a.session_run_id,
    )


def _recording_out(r: Recording) -> RecordingOut:
    return RecordingOut(
        id=r.id, attempt_id=r.attempt_id, kind=r.kind, mime_type=r.mime_type, size_bytes=r.size_bytes, duration_seconds=r.duration_seconds,
        created_at=r.created_at, url=f"/api/v1/recordings/{r.id}/stream",
    )


@router.get("/attempts", response_model=list[AttemptOut])
async def list_attempts(
    content_id: str | None = Query(default=None, alias="contentId"),
    session_run_id: str | None = Query(default=None, alias="sessionRunId"),
    limit: int = 5000,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Attempt).where(Attempt.user_id == user.id)
    if content_id:
        stmt = stmt.where(Attempt.content_id == content_id)
    if session_run_id:
        stmt = stmt.where(Attempt.session_run_id == session_run_id)
    rows = (await db.execute(stmt.order_by(Attempt.completed_at.desc()).limit(limit))).scalars().all()
    return [_out(a) for a in rows]


@router.get("/attempts/history", response_model=dict[str, HistoryEntry])
async def history_index(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(Attempt).where(Attempt.user_id == user.id).order_by(Attempt.completed_at))).scalars().all()
    m: dict[str, HistoryEntry] = {}
    for a in rows:
        if not a.content_id:
            continue
        prev = m.get(a.content_id)
        rating = (a.review or {}).get("overall")
        m[a.content_id] = HistoryEntry(last=a.completed_at, count=(prev.count if prev else 0) + 1, rating=rating if rating is not None else (prev.rating if prev else None))
    return m


@router.post("/attempts", response_model=AttemptOut, status_code=201)
async def create_attempt(body: AttemptCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    content = await get_owned(db, Content, body.content_id, user.id)
    a = Attempt(
        id=new_id(), user_id=user.id, content_id=content.id, content_type=content.type, content_title=content.title, category=content.category,
        difficulty=content.difficulty, variant=body.variant, pass_number=body.pass_, recording_kind=body.recording_kind,
        duration_seconds=round(body.duration_seconds), started_at=body.started_at, completed_at=now_ms(), vocabulary_ids=body.vocabulary_ids,
        session_run_id=body.session_run_id,
    )
    db.add(a)
    if body.vocabulary_ids:
        await db.execute(update(VocabularyItem).where(VocabularyItem.id.in_(body.vocabulary_ids), VocabularyItem.user_id == user.id).values(times_used=VocabularyItem.times_used + 1))
    await db.execute(update(RetryItem).where(RetryItem.user_id == user.id, RetryItem.content_id == content.id, RetryItem.status == "pending").values(status="done"))
    await db.commit()
    return _out(a)


@router.get("/attempts/{attempt_id}", response_model=AttemptOut)
async def get_attempt(attempt_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return _out(await get_owned(db, Attempt, attempt_id, user.id))


@router.patch("/attempts/{attempt_id}", response_model=AttemptOut)
async def update_attempt(attempt_id: str, body: AttemptUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    a = await get_owned(db, Attempt, attempt_id, user.id)
    if body.review is not None:
        review = body.review.model_dump(by_alias=True)
        vals = [v for k, v in (review.get("ratings") or {}).items() if k in RATING_DIMENSIONS and isinstance(v, (int, float)) and v > 0]
        review["overall"] = round(sum(vals) / len(vals) * 10) / 10 if vals else None
        a.review = review
    await db.commit()
    return _out(a)


@router.delete("/attempts/{attempt_id}", status_code=204)
async def delete_attempt(attempt_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    a = await get_owned(db, Attempt, attempt_id, user.id)
    if a.recording_id:
        rec = (await db.execute(select(Recording).where(Recording.id == a.recording_id))).scalar_one_or_none()
        if rec:
            get_storage().delete(rec.storage_key)
            await db.delete(rec)
    await db.delete(a)
    await db.commit()


@router.post("/attempts/{attempt_id}/recording", response_model=RecordingOut, status_code=201)
async def upload_recording(
    attempt_id: str, file: UploadFile, duration_seconds: int = Query(default=0, alias="durationSeconds"),
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    a = await get_owned(db, Attempt, attempt_id, user.id)
    mime = file.content_type or "application/octet-stream"
    kind = "video" if mime.startswith("video") else "audio"
    rec_id = new_id()
    key = storage_key(user.id, rec_id, mime)
    limit = get_settings().max_upload_mb * 1024 * 1024

    async def chunks():
        total = 0
        while True:
            c = await file.read(1024 * 1024)
            if not c:
                break
            total += len(c)
            if total > limit:
                raise HTTPException(413, "Recording too large")
            yield c

    # storage backends are sync; collect via async iterator into a generator-friendly list of chunks
    buffered: list[bytes] = []
    async for c in chunks():
        buffered.append(c)
    size = get_storage().save(key, iter(buffered))
    rec = Recording(
        id=rec_id, user_id=user.id, attempt_id=a.id, kind=kind, mime_type=mime, storage_key=key, size_bytes=size,
        duration_seconds=duration_seconds or a.duration_seconds, created_at=now_ms(),
    )
    db.add(rec)
    a.recording_id = rec.id
    a.recording_kind = kind
    await db.commit()
    return _recording_out(rec)


@router.get("/recordings/{recording_id}", response_model=RecordingOut)
async def get_recording(recording_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return _recording_out(await get_owned(db, Recording, recording_id, user.id))


@router.delete("/recordings/{recording_id}", status_code=204)
async def delete_recording(recording_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rec = await get_owned(db, Recording, recording_id, user.id)
    get_storage().delete(rec.storage_key)
    await db.execute(update(Attempt).where(Attempt.recording_id == rec.id).values(recording_id=None))
    await db.delete(rec)
    await db.commit()


@router.get("/recordings/{recording_id}/stream")
async def stream_recording(recording_id: str, request: Request, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Range-aware streaming so <video> seeking works."""
    rec = await get_owned(db, Recording, recording_id, user.id)
    storage = get_storage()
    if not storage.exists(rec.storage_key):
        raise HTTPException(404, "File missing from storage")
    size = storage.size(rec.storage_key)
    start, end = 0, size - 1
    status = 200
    rng = request.headers.get("range")
    if rng:
        m = re.match(r"bytes=(\d*)-(\d*)", rng)
        if m:
            if m.group(1):
                start = int(m.group(1))
                end = int(m.group(2)) if m.group(2) else size - 1
            elif m.group(2):
                start = max(0, size - int(m.group(2)))
            end = min(end, size - 1)
            if start > end or start >= size:
                raise HTTPException(416, "Range not satisfiable", headers={"Content-Range": f"bytes */{size}"})
            status = 206
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(end - start + 1),
        "Content-Disposition": f'inline; filename="{rec.id}.{rec.storage_key.rsplit(".", 1)[-1]}"',
        "Cache-Control": "private, max-age=3600",
    }
    if status == 206:
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"
    return StreamingResponse(storage.stream(rec.storage_key, start, end), status_code=status, media_type=rec.mime_type, headers=headers)


@router.get("/recordings")
async def storage_usage(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(Recording).where(Recording.user_id == user.id))).scalars().all()
    return {"count": len(rows), "bytes": sum(r.size_bytes for r in rows)}


@router.delete("/recordings", status_code=204)
async def delete_all_recordings(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(Recording).where(Recording.user_id == user.id))).scalars().all()
    for r in rows:
        get_storage().delete(r.storage_key)
        await db.delete(r)
    await db.execute(update(Attempt).where(Attempt.user_id == user.id).values(recording_id=None))
    await db.commit()
