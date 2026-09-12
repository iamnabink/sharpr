from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.ids import new_id, now_ms


class VocabularyItem(Base):
    __tablename__ = "vocabulary"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    word: Mapped[str] = mapped_column(String(200))
    meaning: Mapped[str] = mapped_column(Text, default="")
    example: Mapped[str | None] = mapped_column(Text)
    pronunciation: Mapped[str | None] = mapped_column(String(200))
    synonyms: Mapped[list[str]] = mapped_column(ARRAY(String(100)), default=list)
    category: Mapped[str] = mapped_column(String(64), default="other")
    discovered_in: Mapped[str | None] = mapped_column(Text)
    personal_example: Mapped[str | None] = mapped_column(Text)
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)
    updated_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)


class Book(Base):
    __tablename__ = "books"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    author: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(16), default="want_to_read")
    total_chapters: Mapped[int | None] = mapped_column(Integer)
    current_chapter: Mapped[int] = mapped_column(Integer, default=0)
    pages_read: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str] = mapped_column(Text, default="")
    ideas: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    quotes: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    concepts: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    vocabulary: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    prompts: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)
    updated_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    content_id: Mapped[str | None] = mapped_column(String(32))
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(64)), default=list)
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)
    updated_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)
