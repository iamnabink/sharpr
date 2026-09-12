from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def get_owned[T](db: AsyncSession, model: type[T], id_: str, user_id: str) -> T:
    row = (await db.execute(select(model).where(model.id == id_, model.user_id == user_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, f"{model.__name__} not found")
    return row


def apply_updates(row, payload, exclude: set[str] | None = None, bools: set[str] | None = None) -> None:
    """Applies a pydantic partial-update model onto a row, snake_casing keys."""
    data = payload.model_dump(exclude_unset=True, by_alias=False)
    for k, v in data.items():
        if exclude and k in exclude:
            continue
        if bools and k in bools:
            v = bool(v)
        setattr(row, k, v)
