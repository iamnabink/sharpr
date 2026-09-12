"""Import format: the external-agent contract (snake_case, lenient). Mirrors docs/IMPORT_SCHEMA.md."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.content import ContentType, Difficulty

RESOURCE_TYPES = ("article", "documentation", "video", "podcast", "book", "course", "notes", "cheatsheet", "website")
DEFAULT_DURATION_SECONDS: dict[str, int] = {
    "speaking_topic": 180, "interview_question": 120, "technical_topic": 180, "storytelling_prompt": 180,
    "podcast_topic": 600, "debate": 180, "scenario": 180, "book_prompt": 120, "knowledge_topic": 120, "quick_speaking": 60,
}


class _Lenient(BaseModel):
    model_config = ConfigDict(extra="ignore")


class ImportLearning(_Lenient):
    short: str | None = None
    detailed: str | None = None
    key_points: list[str] | None = None
    examples: list[str] | None = None
    common_mistakes: list[str] | None = None
    interview_questions: list[str] | None = None
    related_topics: list[str] | None = None


class ImportCounterargument(_Lenient):
    against: Literal["defend", "oppose"]
    text: str


class ImportResource(_Lenient):
    type: str = "article"
    title: str = Field(min_length=1)
    url: str | None = None
    author: str | None = None
    description: str | None = None
    body: str | None = None
    tags: list[str] = []
    topics: list[str] = []


class ImportContent(_Lenient):
    type: ContentType
    title: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    category: str = "General"
    subcategory: str | None = None
    difficulty: Difficulty = "intermediate"
    duration: float | None = None
    duration_seconds: int | None = None
    preparation_seconds: int = 30
    tags: list[str] = []
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
    counterarguments: list[ImportCounterargument] | None = None
    role: str | None = None
    situation: str | None = None
    learning: ImportLearning | None = None
    resources: list[ImportResource] = []


class ImportVocabulary(_Lenient):
    word: str = Field(min_length=1)
    meaning: str = Field(min_length=1)
    example: str | None = None
    pronunciation: str | None = None
    synonyms: list[str] = []
    category: str = "other"
    discovered_in: str | None = None
    personal_example: str | None = None


class ImportCollection(_Lenient):
    name: str = Field(min_length=1)
    description: str | None = None
    items: list[str] = []


class ImportBook(_Lenient):
    title: str = Field(min_length=1)
    author: str | None = None
    status: str = "want_to_read"
    total_chapters: int | None = None
    current_chapter: int = 0
    notes: str = ""
    ideas: list[str] = []
    quotes: list[str] = []
    concepts: list[str] = []
    vocabulary: list[str] = []
    prompts: list[str] = []


class ImportFile(_Lenient):
    content: list[ImportContent] = []
    vocabulary: list[ImportVocabulary] = []
    resources: list[ImportResource] = []
    collections: list[ImportCollection] = []
    books: list[ImportBook] = []


class ImportSummary(BaseModel):
    content: int = 0
    resources: int = 0
    vocabulary: int = 0
    collections: int = 0
    books: int = 0
    skipped_duplicates: int = 0
    errors: list[str] = []
