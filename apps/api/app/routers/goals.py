from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.ids import new_id, now_ms
from app.core.security import get_current_user
from app.models.practice import Goal
from app.models.user import User
from app.routers.deps import apply_updates, get_owned
from app.schemas.practice import GoalCreate, GoalOut, GoalUpdate

router = APIRouter(prefix="/goals", tags=["goals"])


def _out(g: Goal) -> GoalOut:
    return GoalOut(id=g.id, title=g.title, metric=g.metric, target=g.target, period=g.period, active=1 if g.active else 0, created_at=g.created_at)


@router.get("", response_model=list[GoalOut])
async def list_goals(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(Goal).where(Goal.user_id == user.id).order_by(Goal.created_at))).scalars().all()
    return [_out(r) for r in rows]


@router.post("", response_model=GoalOut, status_code=201)
async def create_goal(body: GoalCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = Goal(id=new_id(), user_id=user.id, title=body.title, metric=body.metric, target=body.target, period=body.period, active=bool(body.active), created_at=now_ms())
    db.add(row)
    await db.commit()
    return _out(row)


@router.patch("/{goal_id}", response_model=GoalOut)
async def update_goal(goal_id: str, body: GoalUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, Goal, goal_id, user.id)
    apply_updates(row, body, bools={"active"})
    await db.commit()
    return _out(row)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(goal_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await get_owned(db, Goal, goal_id, user.id)
    await db.delete(row)
    await db.commit()
