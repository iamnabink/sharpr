from pydantic import Field

from app.schemas.base import CamelModel


class VocabularyBase(CamelModel):
    word: str = Field(min_length=1)
    meaning: str = ""
    example: str | None = None
    pronunciation: str | None = None
    synonyms: list[str] = []
    category: str = "other"
    discovered_in: str | None = None
    personal_example: str | None = None


class VocabularyCreate(VocabularyBase):
    pass


class VocabularyUpdate(CamelModel):
    word: str | None = None
    meaning: str | None = None
    example: str | None = None
    pronunciation: str | None = None
    synonyms: list[str] | None = None
    category: str | None = None
    discovered_in: str | None = None
    personal_example: str | None = None


class VocabularyOut(VocabularyBase):
    id: str
    times_used: int = 0
    created_at: int
    updated_at: int


class BookBase(CamelModel):
    title: str = Field(min_length=1)
    author: str | None = None
    status: str = "want_to_read"
    total_chapters: int | None = None
    current_chapter: int = 0
    pages_read: int = 0
    notes: str = ""
    ideas: list[str] = []
    quotes: list[str] = []
    concepts: list[str] = []
    vocabulary: list[str] = []
    prompts: list[str] = []


class BookCreate(BookBase):
    pass


class BookUpdate(CamelModel):
    title: str | None = None
    author: str | None = None
    status: str | None = None
    total_chapters: int | None = None
    current_chapter: int | None = None
    pages_read: int | None = None
    notes: str | None = None
    ideas: list[str] | None = None
    quotes: list[str] | None = None
    concepts: list[str] | None = None
    vocabulary: list[str] | None = None
    prompts: list[str] | None = None


class BookOut(BookBase):
    id: str
    created_at: int
    updated_at: int


class NoteBase(CamelModel):
    title: str = ""
    body: str = ""
    content_id: str | None = None
    tags: list[str] = []


class NoteCreate(NoteBase):
    pass


class NoteUpdate(CamelModel):
    title: str | None = None
    body: str | None = None
    content_id: str | None = None
    tags: list[str] | None = None


class NoteOut(NoteBase):
    id: str
    created_at: int
    updated_at: int
