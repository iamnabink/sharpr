import json

from fastapi import APIRouter, Body, Depends, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.content import Collection, CollectionItem, Content, ContentResource, Resource
from app.models.learning import Book, Note, VocabularyItem
from app.models.practice import Attempt, Goal, RetryItem, SessionRun, SessionTemplate
from app.models.user import User
from app.schemas.importing import ImportFile, ImportSummary
from app.services.importer import import_file, parse_csv, parse_json
from app.services.seed import seed_user

router = APIRouter(tags=["import-export"])


def _errors(e: ValidationError) -> list[str]:
    return [f"{'.'.join(str(p) for p in i['loc']) or '(root)'}: {i['msg']}" for i in e.errors()[:20]]


@router.post("/import/validate")
async def validate_import(body: dict | list = Body(...)):
    try:
        data = {"content": body} if isinstance(body, list) else body
        parsed = ImportFile.model_validate(data)
    except ValidationError as e:
        return JSONResponse({"ok": False, "errors": _errors(e)}, status_code=422)
    counts: dict[str, int] = {}
    for c in parsed.content:
        counts[c.type] = counts.get(c.type, 0) + 1
    for k in ("vocabulary", "resources", "collections", "books"):
        if getattr(parsed, k):
            counts[k] = len(getattr(parsed, k))
    return {"ok": True, "counts": counts}


@router.post("/import", response_model=ImportSummary)
async def import_json(
    body: dict | list = Body(...), skip_duplicates: bool = True, source: str = "import:paste",
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    try:
        data = {"content": body} if isinstance(body, list) else body
        parsed = ImportFile.model_validate(data)
    except ValidationError as e:
        raise HTTPException(422, {"errors": _errors(e)}) from e
    return await import_file(db, user.id, parsed, source, skip_duplicates)


@router.post("/import/file", response_model=ImportSummary)
async def import_upload(file: UploadFile, skip_duplicates: bool = True, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    text = (await file.read()).decode("utf-8")
    name = file.filename or "upload"
    try:
        parsed = parse_csv(text) if name.lower().endswith(".csv") else parse_json(text)
    except (ValidationError, json.JSONDecodeError, ValueError) as e:
        raise HTTPException(422, {"errors": _errors(e) if isinstance(e, ValidationError) else [str(e)]}) from e
    return await import_file(db, user.id, parsed, f"import:{name}", skip_duplicates)


@router.post("/seed", response_model=ImportSummary)
async def reseed(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await seed_user(db, user.id)


def _content_export(c: Content, resources: list[Resource]) -> dict:
    d = c.data or {}
    learning = d.get("learning")
    return {
        "type": c.type, "title": c.title, "prompt": c.prompt, "category": c.category, "subcategory": c.subcategory, "difficulty": c.difficulty,
        "duration_seconds": c.duration_seconds, "preparation_seconds": c.preparation_seconds, "tags": c.tags or [],
        "guiding_questions": d.get("guidingQuestions"), "track": c.track, "model_answer_notes": d.get("modelAnswerNotes"),
        "framework": d.get("framework"), "audiences": d.get("audiences"), "opening_question": d.get("openingQuestion"),
        "discussion_points": d.get("discussionPoints"), "follow_up_questions": d.get("followUpQuestions"),
        "controversial_angle": d.get("controversialAngle"), "closing_question": d.get("closingQuestion"), "position": d.get("position"),
        "counterarguments": d.get("counterarguments"), "role": d.get("role"), "situation": d.get("situation"),
        "learning": {
            "short": learning.get("short"), "detailed": learning.get("detailed"), "key_points": learning.get("keyPoints"),
            "examples": learning.get("examples"), "common_mistakes": learning.get("commonMistakes"),
            "interview_questions": learning.get("interviewQuestions"), "related_topics": learning.get("relatedTopics"),
        } if learning else None,
        "resources": [
            {"type": r.type, "title": r.title, "url": r.url, "author": r.author, "description": r.description, "body": r.body, "tags": r.tags or []}
            for r in resources
        ],
    }


@router.get("/export")
async def export_content(ids: str | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Content).where(Content.user_id == user.id)
    if ids:
        stmt = stmt.where(Content.id.in_(ids.split(",")))
    content = (await db.execute(stmt)).scalars().all()
    links = (await db.execute(select(ContentResource).where(ContentResource.content_id.in_([c.id for c in content]) if content else False))).scalars().all()
    res_ids = {link.resource_id for link in links}
    resources = {r.id: r for r in (await db.execute(select(Resource).where(Resource.id.in_(res_ids)))).scalars().all()} if res_ids else {}
    by_content: dict[str, list[Resource]] = {}
    for link in links:
        if link.resource_id in resources:
            by_content.setdefault(link.content_id, []).append(resources[link.resource_id])
    out = {"content": [_content_export(c, by_content.get(c.id, [])) for c in content]}
    if not ids:
        vocab = (await db.execute(select(VocabularyItem).where(VocabularyItem.user_id == user.id))).scalars().all()
        out["vocabulary"] = [
            {"word": v.word, "meaning": v.meaning, "example": v.example, "pronunciation": v.pronunciation, "synonyms": v.synonyms or [],
             "category": v.category, "discovered_in": v.discovered_in, "personal_example": v.personal_example}
            for v in vocab
        ]
        cols = (await db.execute(select(Collection).where(Collection.user_id == user.id))).scalars().all()
        titles = {c.id: c.title for c in content}
        out["collections"] = []
        for col in cols:
            items = (await db.execute(select(CollectionItem.content_id).where(CollectionItem.collection_id == col.id))).scalars().all()
            out["collections"].append({"name": col.name, "description": col.description, "items": [titles[i] for i in items if i in titles]})
        books = (await db.execute(select(Book).where(Book.user_id == user.id))).scalars().all()
        out["books"] = [
            {"title": b.title, "author": b.author, "status": b.status, "total_chapters": b.total_chapters, "current_chapter": b.current_chapter,
             "notes": b.notes, "ideas": b.ideas, "quotes": b.quotes, "concepts": b.concepts, "vocabulary": b.vocabulary, "prompts": b.prompts}
            for b in books
        ]
    return out


@router.get("/export/backup")
async def export_backup(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Everything except recording files."""
    def rows(model):
        return db.execute(select(model).where(model.user_id == user.id))

    def dump(r):
        return {c.name: getattr(r, c.key if c.key != "pass" else "pass_number", None) for c in r.__table__.columns}

    out = {"version": 2, "exportedAt": __import__("time").time() * 1000}
    for name, model in (
        ("content", Content), ("resources", Resource), ("collections", Collection), ("vocabulary", VocabularyItem), ("books", Book),
        ("attempts", Attempt), ("retryQueue", RetryItem), ("sessionTemplates", SessionTemplate), ("sessionRuns", SessionRun),
        ("goals", Goal), ("notes", Note),
    ):
        out[name] = [dump(r) for r in (await rows(model)).scalars().all()]
    return out
