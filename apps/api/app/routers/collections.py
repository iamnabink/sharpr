from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.ids import new_id, now_ms
from app.core.security import get_current_user
from app.models.content import Collection, CollectionItem
from app.models.user import User
from app.routers.deps import get_owned
from app.schemas.content import CollectionCreate, CollectionOut, CollectionUpdate

router = APIRouter(prefix="/collections", tags=["collections"])


async def _items(db: AsyncSession, ids: list[str]) -> dict[str, list[str]]:
    if not ids:
        return {}
    rows = (await db.execute(select(CollectionItem).where(CollectionItem.collection_id.in_(ids)).order_by(CollectionItem.position))).scalars().all()
    m: dict[str, list[str]] = {}
    for r in rows:
        m.setdefault(r.collection_id, []).append(r.content_id)
    return m


def _out(c: Collection, ids: list[str]) -> CollectionOut:
    return CollectionOut(id=c.id, name=c.name, description=c.description, content_ids=ids, created_at=c.created_at, updated_at=c.updated_at)


@router.get("", response_model=list[CollectionOut])
async def list_collections(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(Collection).where(Collection.user_id == user.id).order_by(Collection.created_at))).scalars().all()
    m = await _items(db, [r.id for r in rows])
    return [_out(r, m.get(r.id, [])) for r in rows]


@router.post("", response_model=CollectionOut, status_code=201)
async def create_collection(body: CollectionCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    ts = now_ms()
    c = Collection(id=new_id(), user_id=user.id, name=body.name, description=body.description, created_at=ts, updated_at=ts)
    db.add(c)
    for i, cid in enumerate(body.content_ids):
        db.add(CollectionItem(collection_id=c.id, content_id=cid, position=i))
    await db.commit()
    return _out(c, body.content_ids)


@router.patch("/{collection_id}", response_model=CollectionOut)
async def update_collection(collection_id: str, body: CollectionUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    c = await get_owned(db, Collection, collection_id, user.id)
    if body.name is not None:
        c.name = body.name
    if body.description is not None:
        c.description = body.description
    current = (await _items(db, [c.id])).get(c.id, [])
    ids = list(current)
    if body.content_ids is not None:
        ids = list(dict.fromkeys(body.content_ids))
    if body.add_content_ids:
        ids = list(dict.fromkeys(ids + body.add_content_ids))
    if body.remove_content_ids:
        ids = [x for x in ids if x not in set(body.remove_content_ids)]
    if ids != current:
        await db.execute(delete(CollectionItem).where(CollectionItem.collection_id == c.id))
        for i, cid in enumerate(ids):
            db.add(CollectionItem(collection_id=c.id, content_id=cid, position=i))
    c.updated_at = now_ms()
    await db.commit()
    return _out(c, ids)


@router.delete("/{collection_id}", status_code=204)
async def delete_collection(collection_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    c = await get_owned(db, Collection, collection_id, user.id)
    await db.delete(c)
    await db.commit()
