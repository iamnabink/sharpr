from typing import Any, Literal

from pydantic import Field

from app.schemas.base import CamelModel


class Review(CamelModel):
    ratings: dict[str, int] = {}
    overall: float | None = None
    flags: list[str] = []
    went_well: str | None = None
    to_improve: str | None = None
    to_research: str | None = None
    words_to_learn: str | None = None


class AttemptCreate(CamelModel):
    content_id: str
    variant: str | None = None
    pass_: int = Field(default=1, alias="pass")
    recording_kind: Literal["audio", "video", "none"] = "none"
    duration_seconds: float
    started_at: int
    vocabulary_ids: list[str] = []
    session_run_id: str | None = None


class AttemptUpdate(CamelModel):
    review: Review | None = None


class AttemptOut(CamelModel):
    id: str
    content_id: str | None
    content_type: str
    content_title: str
    category: str
    difficulty: str
    variant: str | None = None
    pass_: int = Field(default=1, alias="pass")
    recording_kind: str
    recording_id: str | None = None
    duration_seconds: int
    started_at: int
    completed_at: int
    review: Review | None = None
    vocabulary_ids: list[str] = []
    session_run_id: str | None = None


class RecordingOut(CamelModel):
    id: str
    attempt_id: str
    kind: str
    mime_type: str
    size_bytes: int
    duration_seconds: int
    created_at: int
    url: str


class RetryCreate(CamelModel):
    content_id: str
    due_at: int
    attempt_id: str | None = None
    reason: str | None = None


class RetryUpdate(CamelModel):
    due_at: int | None = None
    status: Literal["pending", "done", "dismissed"] | None = None
    reason: str | None = None


class RetryOut(CamelModel):
    id: str
    content_id: str
    attempt_id: str | None = None
    reason: str | None = None
    due_at: int
    status: str
    created_at: int


class SessionStep(CamelModel):
    id: str
    label: str
    types: list[str] = []
    category: str | None = None
    difficulty: str | None = None
    duration_seconds: int | None = None
    kind: Literal["practice", "learn", "reflect"] = "practice"


class SessionTemplateBase(CamelModel):
    name: str = Field(min_length=1)
    description: str | None = None
    estimated_minutes: int = 15
    steps: list[SessionStep] = []


class SessionTemplateCreate(SessionTemplateBase):
    pass


class SessionTemplateUpdate(CamelModel):
    name: str | None = None
    description: str | None = None
    estimated_minutes: int | None = None
    steps: list[SessionStep] | None = None


class SessionTemplateOut(SessionTemplateBase):
    id: str
    built_in: int = 0
    created_at: int
    updated_at: int


class SessionRunCreate(CamelModel):
    template_id: str | None = None
    # for mock interviews / ad-hoc runs: explicit content ids and a name
    template_name: str | None = None
    content_ids: list[str] | None = None


class SessionRunUpdate(CamelModel):
    current_step: int | None = None
    append_attempt_id: str | None = None
    completed_at: int | None = None
    reflection: str | None = None


class SessionRunOut(CamelModel):
    id: str
    template_id: str
    template_name: str
    started_at: int
    completed_at: int | None = None
    current_step: int
    steps: list[SessionStep] = []
    step_content_ids: list[str | None] = []
    attempt_ids: list[str] = []
    reflection: str | None = None


class GoalBase(CamelModel):
    title: str
    metric: str
    target: float
    period: Literal["day", "week"] = "week"
    active: int = 1


class GoalCreate(GoalBase):
    pass


class GoalUpdate(CamelModel):
    title: str | None = None
    metric: str | None = None
    target: float | None = None
    period: Literal["day", "week"] | None = None
    active: int | None = None


class GoalOut(GoalBase):
    id: str
    created_at: int


class SettingIn(CamelModel):
    value: Any


class HistoryEntry(CamelModel):
    last: int
    count: int
    rating: float | None = None
