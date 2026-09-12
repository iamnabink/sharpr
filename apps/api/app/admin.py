"""Minimal table admin at /admin (admin role only). Uses sqladmin over the same models."""

from fastapi import FastAPI
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from sqlalchemy import select
from starlette.requests import Request

from app.core.config import get_settings
from app.core.db import SessionLocal, engine
from app.core.security import create_token, decode_token, verify_password
from app.models import (
    Attempt,
    Book,
    Collection,
    Content,
    Goal,
    Note,
    Recording,
    Resource,
    RetryItem,
    SessionRun,
    SessionTemplate,
    User,
    VocabularyItem,
)


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        email, password = str(form.get("username", "")), str(form.get("password", ""))
        async with SessionLocal() as db:
            user = (await db.execute(select(User).where(User.email == email.lower()))).scalar_one_or_none()
        if not user or user.role != "admin" or not verify_password(password, user.password_hash):
            return False
        request.session.update({"token": create_token(user.id)})
        return True

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        token = request.session.get("token") or request.cookies.get(get_settings().cookie_name)
        user_id = decode_token(token) if token else None
        if not user_id:
            return False
        async with SessionLocal() as db:
            user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        return bool(user and user.role == "admin")


def _view(model, cols, name=None):
    return type(f"{model.__name__}Admin", (ModelView,), {"column_list": cols, "name_plural": name or model.__tablename__, "page_size": 50}, model=model)


def mount_admin(app: FastAPI) -> None:
    admin = Admin(app, engine, authentication_backend=AdminAuth(secret_key=get_settings().secret_key), title="Sharpr admin")
    admin.add_view(_view(User, [User.id, User.email, User.name, User.role, User.active, User.created_at], "Users"))
    admin.add_view(_view(Content, [Content.id, Content.user_id, Content.type, Content.title, Content.category, Content.difficulty, Content.status], "Content"))
    admin.add_view(_view(Resource, [Resource.id, Resource.user_id, Resource.type, Resource.title, Resource.completed], "Resources"))
    admin.add_view(_view(Collection, [Collection.id, Collection.user_id, Collection.name], "Collections"))
    admin.add_view(_view(VocabularyItem, [VocabularyItem.id, VocabularyItem.user_id, VocabularyItem.word, VocabularyItem.category], "Vocabulary"))
    admin.add_view(_view(Book, [Book.id, Book.user_id, Book.title, Book.status], "Books"))
    admin.add_view(_view(Attempt, [Attempt.id, Attempt.user_id, Attempt.content_title, Attempt.duration_seconds, Attempt.completed_at], "Attempts"))
    admin.add_view(_view(Recording, [Recording.id, Recording.user_id, Recording.kind, Recording.size_bytes, Recording.storage_key], "Recordings"))
    admin.add_view(_view(RetryItem, [RetryItem.id, RetryItem.user_id, RetryItem.content_id, RetryItem.due_at, RetryItem.status], "Retry queue"))
    admin.add_view(_view(SessionTemplate, [SessionTemplate.id, SessionTemplate.user_id, SessionTemplate.name, SessionTemplate.built_in], "Session templates"))
    admin.add_view(_view(SessionRun, [SessionRun.id, SessionRun.user_id, SessionRun.template_name, SessionRun.started_at, SessionRun.completed_at], "Session runs"))
    admin.add_view(_view(Goal, [Goal.id, Goal.user_id, Goal.title, Goal.metric, Goal.target, Goal.active], "Goals"))
    admin.add_view(_view(Note, [Note.id, Note.user_id, Note.title, Note.updated_at], "Notes"))
