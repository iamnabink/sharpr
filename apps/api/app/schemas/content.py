from typing import Literal

from pydantic import Field

from app.schemas.base import CamelModel

ContentType = Literal[
    "speaking_topic", "interview_question", "technical_topic", "storytelling_prompt", "podcast_topic",
    "debate", "scenario", "book_prompt", "knowledge_topic", "quick_speaking",
]
Difficulty = Literal["beginner", "intermediate", "advanced", "expert"]


class LearningContent(CamelModel):
    short: str | None = None
    detailed: str | None = None
    key_points: list[str] | None = None
    examples: list[str] | None = None
    common_mistakes: list[str] | None = None
    interview_questions: list[str] | None = None
    related_topics: list[str] | None = None


class Counterargument(CamelModel):
    against: Literal["defend", "oppose"]
    text: str


class ContentBase(CamelModel):
    type: ContentType
    title: str = Field(min_length=1, max_length=500)
    prompt: str = Field(min_length=1)
    category: str = "General"
    subcategory: str | None = None
    difficulty: Difficulty = "intermediate"
    duration_seconds: int = 180
    preparation_seconds: int = 30
    tags: list[str] = []
    status: Literal["active", "archived"] = "active"
    bookmarked: int = 0
    source: str = "manual"
    # type-specific
    guiding_questions: list[str] | None = None
    track: str | None = None
    model_answer_notes: str | None = None
    framework: str | None = None
    audiences: list[str] | None = None
    opening_question: str | None = None
    discussion_points: list[str] | None = None
    follow_up_questions: list[str] | None = None
    controversial_angle: str | None = None
    closing_question: str | None = None
    position: str | None = None
    counterarguments: list[Counterargument] | None = None
    role: str | None = None
    situation: str | None = None
    book_id: str | None = None
    learning: LearningContent | None = None


# keys stored in Content.data (camelCase, as the client sees them)
DATA_KEYS = [
    "guidingQuestions", "modelAnswerNotes", "framework", "audiences", "openingQuestion", "discussionPoints",
    "followUpQuestions", "controversialAngle", "closingQuestion", "position", "counterarguments", "role",
    "situation", "learning",
]


class ContentCreate(ContentBase):
    pass


class ContentUpdate(CamelModel):
    type: ContentType | None = None
    title: str | None = None
    prompt: str | None = None
    category: str | None = None
    subcategory: str | None = None
    difficulty: Difficulty | None = None
    duration_seconds: int | None = None
    preparation_seconds: int | None = None
    tags: list[str] | None = None
    status: Literal["active", "archived"] | None = None
    bookmarked: int | None = None
    guiding_questions: list[str] | None = None
    track: str | None = None
    model_answer_notes: str | None = None
    framework: str | None = None
    audiences: list[str] | None = None
    opening_question: str | None = None
    discussion_points: list[str] | None = None
    follow_up_questions: list[str] | None = None
    controversial_angle: str | None = None
    closing_question: str | None = None
    position: str | None = None
    counterarguments: list[Counterargument] | None = None
    role: str | None = None
    situation: str | None = None
    book_id: str | None = None
    learning: LearningContent | None = None
    resource_ids: list[str] | None = None


class ContentOut(ContentBase):
    id: str
    resource_ids: list[str] = []
    created_at: int
    updated_at: int


class BulkAction(CamelModel):
    ids: list[str]
    action: Literal["archive", "unarchive", "delete", "duplicate", "bookmark", "unbookmark"]


class ResourceBase(CamelModel):
    type: str = "article"
    title: str = Field(min_length=1)
    url: str | None = None
    author: str | None = None
    description: str | None = None
    body: str | None = None
    tags: list[str] = []
    topic_ids: list[str] = []
    completed: int = 0


class ResourceCreate(ResourceBase):
    pass


class ResourceUpdate(CamelModel):
    type: str | None = None
    title: str | None = None
    url: str | None = None
    author: str | None = None
    description: str | None = None
    body: str | None = None
    tags: list[str] | None = None
    topic_ids: list[str] | None = None
    completed: int | None = None


class ResourceOut(ResourceBase):
    id: str
    created_at: int
    updated_at: int


class CollectionBase(CamelModel):
    name: str = Field(min_length=1)
    description: str | None = None
    content_ids: list[str] = []


class CollectionCreate(CollectionBase):
    pass


class CollectionUpdate(CamelModel):
    name: str | None = None
    description: str | None = None
    content_ids: list[str] | None = None
    add_content_ids: list[str] | None = None
    remove_content_ids: list[str] | None = None


class CollectionOut(CollectionBase):
    id: str
    created_at: int
    updated_at: int
