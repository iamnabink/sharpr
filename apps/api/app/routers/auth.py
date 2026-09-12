from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_db
from app.core.security import create_token, get_current_user, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginIn, RegisterIn, TokenOut, UserOut
from app.services.seed import seed_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_cookie(response: Response, token: str) -> None:
    s = get_settings()
    response.set_cookie(
        s.cookie_name, token, httponly=True, samesite="lax", secure=s.cookie_secure, max_age=s.access_token_days * 86400, path="/",
    )


@router.get("/config")
async def auth_config(db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(User.id)))).scalar_one()
    return {"allowRegistration": get_settings().allow_registration or count == 0, "hasUsers": count > 0}


@router.post("/register", response_model=TokenOut)
async def register(body: RegisterIn, response: Response, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count(User.id)))).scalar_one()
    if count > 0 and not get_settings().allow_registration:
        raise HTTPException(403, "Registration is disabled")
    email = body.email.lower()
    if (await db.execute(select(User).where(User.email == email))).scalar_one_or_none():
        raise HTTPException(409, "Email already registered")
    user = User(email=email, name=body.name.strip(), password_hash=hash_password(body.password), role="admin" if count == 0 else "user")
    db.add(user)
    await db.commit()
    await seed_user(db, user.id)
    token = create_token(user.id)
    _set_cookie(response, token)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == body.email.lower()))).scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash) or not user.active:
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user.id)
    _set_cookie(response, token)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(get_settings().cookie_name, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)
