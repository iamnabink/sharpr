from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.ids import new_id, now_ms
from app.core.security import get_current_user
from app.models.content import ContentResource, Resource
from app.models.user import User
from app.routers.deps import get_owned
from app.schemas.content import ResourceCreate, ResourceOut, ResourceUpdate

router = APIRouter(prefix="/resources", tags=["resources"])


async def _topics(db: AsyncSession, ids: list[str]) -> dict[str, list[str]]:
    if not ids:
        return {}
    rows = (await db.execute(select(ContentResource).where(ContentResource.resource_id.in_(ids)))).scalars().all()
    m: dict[str, list[str]] = {}
    for r in rows:
        m.setdefault(r.resource_id, []).append(r.content_id)
    return m


def _out(r: Resource, topic_ids: list[str]) -> ResourceOut:
    return ResourceOut(
        id=r.id, type=r.type, title=r.title, url=r.url, author=r.author, description=r.description, body=r.body, tags=r.tags or [],
        topic_ids=topic_ids, completed=1 if r.completed else 0, created_at=r.created_at, updated_at=r.updated_at,
    )


@router.get("", response_model=list[ResourceOut])
async def list_resources(
    topic_id: str | None = Query(default=None, alias="topicId"), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    stmt = select(Resource).where(Resource.user_id == user.id)
    if topic_id:
        stmt = stmt.join(ContentResource, ContentResource.resource_id == Resource.id).where(ContentResource.content_id == topic_id)
    rows = (await db.execute(stmt.order_by(Resource.created_at.desc()))).scalars().all()
    m = await _topics(db, [r.id for r in rows])
    return [_out(r, m.get(r.id, [])) for r in rows]


@router.post("", response_model=ResourceOut, status_code=201)
async def create_resource(body: ResourceCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    ts = now_ms()
    r = Resource(
        id=new_id(), user_id=user.id, type=body.type, title=body.title, url=body.url, author=body.author, description=body.description,
        body=body.body, tags=[t.lower() for t in body.tags], completed=bool(body.completed), created_at=ts, updated_at=ts,
    )
    db.add(r)
    for cid in body.topic_ids:
        db.add(ContentResource(content_id=cid, resource_id=r.id))
    await db.commit()
    return _out(r, body.topic_ids)


@router.patch("/{resource_id}", response_model=ResourceOut)
async def update_resource(resource_id: str, body: ResourceUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    r = await get_owned(db, Resource, resource_id, user.id)
    data = body.model_dump(exclude_unset=True)
    topic_ids = data.pop("topic_ids", None)
    for k, v in data.items():
        if k == "completed":
            v = bool(v)
        if k == "tags":
            v = [t.lower() for t in v]
        setattr(r, k, v)
    r.updated_at = now_ms()
    if topic_ids is not None:
        await db.execute(delete(ContentResource).where(ContentResource.resource_id == r.id))
        for cid in topic_ids:
            db.add(ContentResource(content_id=cid, resource_id=r.id))
    await db.commit()
    m = await _topics(db, [r.id])
    return _out(r, m.get(r.id, []))


@router.delete("/{resource_id}", status_code=204)
async def delete_resource(resource_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    r = await get_owned(db, Resource, resource_id, user.id)
    await db.delete(r)
    await db.commit()
