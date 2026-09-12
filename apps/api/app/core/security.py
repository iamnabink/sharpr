from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, HTTPException, Request, status
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_db
from app.models.user import User

_hasher = PasswordHash.recommended()


def hash_password(p: str) -> str:
    return _hasher.hash(p)


def verify_password(p: str, h: str) -> bool:
    return _hasher.verify(p, h)


def create_token(user_id: str) -> str:
    s = get_settings()
    exp = datetime.now(UTC) + timedelta(days=s.access_token_days)
    return jwt.encode({"sub": user_id, "exp": exp}, s.secret_key, algorithm="HS256")


def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


def _token_from_request(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.cookies.get(get_settings().cookie_name)


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    token = _token_from_request(request)
    user_id = decode_token(token) if token else None
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user


async def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin only")
    return user
