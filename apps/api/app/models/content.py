from sqlalchemy import BigInteger, Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.ids import new_id, now_ms


class Content(Base):
    __tablename__ = "content"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(500))
    prompt: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(120), default="General")
    subcategory: Mapped[str | None] = mapped_column(String(120))
    difficulty: Mapped[str] = mapped_column(String(16), default="intermediate")
    duration_seconds: Mapped[int] = mapped_column(Integer, default=180)
    preparation_seconds: Mapped[int] = mapped_column(Integer, default=30)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(64)), default=list)
    status: Mapped[str] = mapped_column(String(16), default="active")
    bookmarked: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(200), default="manual")
    track: Mapped[str | None] = mapped_column(String(32))
    book_id: Mapped[str | None] = mapped_column(String(32))
    # type-specific fields (guidingQuestions, learning, counterarguments, ...) in camelCase keys
    data: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)
    updated_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)

    __table_args__ = (
        Index("ix_content_user_type", "user_id", "type"),
        Index("ix_content_user_status", "user_id", "status"),
        Index("ix_content_tags", "tags", postgresql_using="gin"),
    )


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(32), default="article")
    title: Mapped[str] = mapped_column(String(500))
    url: Mapped[str | None] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(64)), default=list)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)
    updated_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)


class ContentResource(Base):
    __tablename__ = "content_resources"

    content_id: Mapped[str] = mapped_column(String(32), ForeignKey("content.id", ondelete="CASCADE"), primary_key=True)
    resource_id: Mapped[str] = mapped_column(String(32), ForeignKey("resources.id", ondelete="CASCADE"), primary_key=True)


class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)
    updated_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)


class CollectionItem(Base):
    __tablename__ = "collection_items"

    collection_id: Mapped[str] = mapped_column(String(32), ForeignKey("collections.id", ondelete="CASCADE"), primary_key=True)
    content_id: Mapped[str] = mapped_column(String(32), ForeignKey("content.id", ondelete="CASCADE"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
