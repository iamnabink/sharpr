from sqlalchemy import BigInteger, Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.ids import new_id, now_ms


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("content.id", ondelete="SET NULL"), index=True)
    content_type: Mapped[str] = mapped_column(String(32))
    content_title: Mapped[str] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(120))
    difficulty: Mapped[str] = mapped_column(String(16))
    variant: Mapped[str | None] = mapped_column(String(64))
    pass_number: Mapped[int] = mapped_column("pass", Integer, default=1)
    recording_kind: Mapped[str] = mapped_column(String(8), default="none")
    recording_id: Mapped[str | None] = mapped_column(String(32))
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)
    completed_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)
    review: Mapped[dict | None] = mapped_column(JSONB)
    vocabulary_ids: Mapped[list[str]] = mapped_column(ARRAY(String(32)), default=list)
    session_run_id: Mapped[str | None] = mapped_column(String(32))

    __table_args__ = (Index("ix_attempts_user_completed", "user_id", "completed_at"),)


class Recording(Base):
    __tablename__ = "recordings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    attempt_id: Mapped[str] = mapped_column(String(32), ForeignKey("attempts.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(8))  # audio | video
    mime_type: Mapped[str] = mapped_column(String(100))
    storage_key: Mapped[str] = mapped_column(Text)
    size_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)


class RetryItem(Base):
    __tablename__ = "retry_queue"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_id: Mapped[str] = mapped_column(String(32), ForeignKey("content.id", ondelete="CASCADE"), index=True)
    attempt_id: Mapped[str | None] = mapped_column(String(32))
    reason: Mapped[str | None] = mapped_column(Text)
    due_at: Mapped[int] = mapped_column(BigInteger)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)


class SessionTemplate(Base):
    __tablename__ = "session_templates"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=15)
    steps: Mapped[list] = mapped_column(JSONB, default=list)
    built_in: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)
    updated_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)


class SessionRun(Base):
    __tablename__ = "session_runs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    template_id: Mapped[str] = mapped_column(String(32))
    template_name: Mapped[str] = mapped_column(String(200))
    started_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)
    completed_at: Mapped[int | None] = mapped_column(BigInteger)
    current_step: Mapped[int] = mapped_column(Integer, default=0)
    steps: Mapped[list] = mapped_column(JSONB, default=list)
    step_content_ids: Mapped[list] = mapped_column(JSONB, default=list)
    attempt_ids: Mapped[list] = mapped_column(JSONB, default=list)
    reflection: Mapped[str | None] = mapped_column(Text)


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    metric: Mapped[str] = mapped_column(String(32))
    target: Mapped[float] = mapped_column(Integer)
    period: Mapped[str] = mapped_column(String(8), default="week")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)


class Setting(Base):
    __tablename__ = "settings"

    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, default=dict)
