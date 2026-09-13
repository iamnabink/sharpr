"""Creates the bootstrap admin from ADMIN_EMAIL / ADMIN_PASSWORD on first start, if no users exist."""

from __future__ import annotations

from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.services.seed import seed_user


async def bootstrap_admin() -> None:
    s = get_settings()
    email, password = s.admin_email.strip().lower(), s.admin_password
    if not email or not password:
        return
    async with SessionLocal() as db:
        count = (await db.execute(select(func.count(User.id)))).scalar_one()
        if count > 0:
            return
        if len(password) < 8:
            print("ADMIN_PASSWORD must be at least 8 characters; bootstrap admin not created")
            return
        user = User(email=email, name=s.admin_name.strip() or "Admin", password_hash=hash_password(password), role="admin")
        db.add(user)
        await db.commit()
        await seed_user(db, user.id)
        print(f"Bootstrap admin created: {email}")
