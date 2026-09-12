from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.ids import new_id, now_ms
from app.core.security import get_current_user
from app.engine.random_engine import RandomFilter, candidates, weighted_pick
from app.models.practice import SessionRun, SessionTemplate
from app.models.user import User
from app.routers.deps import get_owned
from app.schemas.practice import (
    SessionRunCreate,
    SessionRunOut,
    SessionRunUpdate,
    SessionTemplateCreate,
    SessionTemplateOut,
    SessionTemplateUpdate,
)

router = APIRouter(tags=["sessions"])


def _tpl_out(t: SessionTemplate) -> SessionTemplateOut:
    return SessionTemplateOut(
        id=t.id, name=t.name, description=t.description, estimated_minutes=t.estimated_minutes, steps=t.steps or [],
        built_in=1 if t.built_in else 0, created_at=t.created_at, updated_at=t.updated_at,
    )


def _run_out(r: SessionRun) -> SessionRunOut:
    return SessionRunOut(
        id=r.id, template_id=r.template_id, template_name=r.template_name, started_at=r.started_at, completed_at=r.completed_at,
        current_step=r.current_step, steps=r.steps or [], step_content_ids=r.step_content_ids or [], attempt_ids=r.attempt_ids or [],
        reflection=r.reflection,
    )


@router.get("/session-templates", response_model=list[SessionTemplateOut])
async def list_templates(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        await db.execute(
            select(SessionTemplate).where(SessionTemplate.user_id == user.id).order_by(SessionTemplate.built_in.desc(), SessionTemplate.position, SessionTemplate.created_at)
        )
    ).scalars().all()
    return [_tpl_out(t) for t in rows]


@router.post("/session-templates", response_model=SessionTemplateOut, status_code=201)
async def create_template(body: SessionTemplateCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    ts = now_ms()
    t = SessionTemplate(
        id=new_id(), user_id=user.id, name=body.name, description=body.description, estimated_minutes=body.estimated_minutes,
        steps=[s.model_dump(by_alias=True, exclude_none=True) for s in body.steps], built_in=False, position=100, created_at=ts, updated_at=ts,
    )
    db.add(t)
    await db.commit()
    return _tpl_out(t)


@router.patch("/session-templates/{template_id}", response_model=SessionTemplateOut)
async def update_template(template_id: str, body: SessionTemplateUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    t = await get_owned(db, SessionTemplate, template_id, user.id)
    if t.built_in:
        raise HTTPException(400, "Built-in templates cannot be edited; duplicate it first")
    data = body.model_dump(exclude_unset=True)
    if "steps" in data and data["steps"] is not None:
        t.steps = [s.model_dump(by_alias=True, exclude_none=True) for s in body.steps]
        del data["steps"]
    for k, v in data.items():
        setattr(t, k, v)
    t.updated_at = now_ms()
    await db.commit()
    return _tpl_out(t)


@router.post("/session-templates/{template_id}/duplicate", response_model=SessionTemplateOut, status_code=201)
async def duplicate_template(template_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    t = await get_owned(db, SessionTemplate, template_id, user.id)
    ts = now_ms()
    c = SessionTemplate(
        id=new_id(), user_id=user.id, name=f"{t.name} (custom)", description=t.description, estimated_minutes=t.estimated_minutes,
        steps=list(t.steps or []), built_in=False, position=100, created_at=ts, updated_at=ts,
    )
    db.add(c)
    await db.commit()
    return _tpl_out(c)


@router.delete("/session-templates/{template_id}", status_code=204)
async def delete_template(template_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    t = await get_owned(db, SessionTemplate, template_id, user.id)
    if t.built_in:
        raise HTTPException(400, "Built-in templates cannot be deleted")
    await db.delete(t)
    await db.commit()


@router.get("/session-runs", response_model=list[SessionRunOut])
async def list_runs(limit: int = 20, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(SessionRun).where(SessionRun.user_id == user.id).order_by(SessionRun.started_at.desc()).limit(limit))).scalars().all()
    return [_run_out(r) for r in rows]


@router.post("/session-runs", response_model=SessionRunOut, status_code=201)
async def create_run(body: SessionRunCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if body.template_id:
        t = await get_owned(db, SessionTemplate, body.template_id, user.id)
        used: list[str] = []
        ids: list[str | None] = []
        for s in t.steps or []:
            if s.get("kind") == "reflect":
                ids.append(None)
                continue
            f = RandomFilter(types=s.get("types") or None, category=s.get("category"), difficulty=[s["difficulty"]] if s.get("difficulty") else None, exclude=list(used))
            pick = weighted_pick(await candidates(db, user.id, f))
            if pick:
                used.append(pick[0].id)
            ids.append(pick[0].id if pick else None)
        if all(x is None for x in ids):
            raise HTTPException(400, "No content matches this session's steps")
        run = SessionRun(id=new_id(), user_id=user.id, template_id=t.id, template_name=t.name, started_at=now_ms(), current_step=0, steps=t.steps, step_content_ids=ids, attempt_ids=[])
    elif body.content_ids:
        steps = [{"id": str(i), "label": f"Question {i + 1}", "kind": "practice", "types": []} for i in range(len(body.content_ids))]
        run = SessionRun(
            id=new_id(), user_id=user.id, template_id="mock", template_name=body.template_name or "Mock session", started_at=now_ms(),
            current_step=0, steps=steps, step_content_ids=list(body.content_ids), attempt_ids=[],
        )
    else:
        raise HTTPException(400, "templateId or contentIds required")
    db.add(run)
    await db.commit()
    return _run_out(run)


@router.get("/session-runs/{run_id}", response_model=SessionRunOut)
async def get_run(run_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return _run_out(await get_owned(db, SessionRun, run_id, user.id))


@router.patch("/session-runs/{run_id}", response_model=SessionRunOut)
async def update_run(run_id: str, body: SessionRunUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    r = await get_owned(db, SessionRun, run_id, user.id)
    if body.current_step is not None:
        r.current_step = body.current_step
    if body.append_attempt_id:
        r.attempt_ids = [*(r.attempt_ids or []), body.append_attempt_id]
    if body.completed_at is not None:
        r.completed_at = body.completed_at
    if body.reflection is not None:
        r.reflection = body.reflection
    await db.commit()
    return _run_out(r)
