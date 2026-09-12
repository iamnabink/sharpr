"""Seeds a new user's library: bundled content, built-in session templates and default goals."""

from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.ids import new_id, now_ms
from app.models.practice import Goal, SessionTemplate
from app.schemas.importing import ImportFile, ImportSummary
from app.services.importer import import_file

BUILT_IN_TEMPLATES = [
    {
        "name": "20-Minute Daily Sharpr",
        "description": "The default daily workout: speak, explain, answer, learn, tell, reflect.",
        "estimatedMinutes": 20,
        "steps": [
            {"id": "s1", "label": "2-minute random speaking", "kind": "practice", "types": ["speaking_topic", "quick_speaking"], "durationSeconds": 120},
            {"id": "s2", "label": "Technical explanation", "kind": "practice", "types": ["technical_topic"]},
            {"id": "s3", "label": "Interview question", "kind": "practice", "types": ["interview_question"]},
            {"id": "s4", "label": "Learn one concept", "kind": "learn", "types": ["technical_topic", "knowledge_topic"]},
            {"id": "s5", "label": "Storytelling challenge", "kind": "practice", "types": ["storytelling_prompt"]},
            {"id": "s6", "label": "Reflection", "kind": "reflect", "types": []},
        ],
    },
    {
        "name": "Morning Sharpening",
        "description": "Wake up the voice. Three short bursts.",
        "estimatedMinutes": 8,
        "steps": [
            {"id": "s1", "label": "30-second warm-up", "kind": "practice", "types": ["quick_speaking"], "durationSeconds": 30},
            {"id": "s2", "label": "2-minute opinion", "kind": "practice", "types": ["speaking_topic"], "durationSeconds": 120},
            {"id": "s3", "label": "Explain one thing", "kind": "practice", "types": ["technical_topic", "knowledge_topic"], "durationSeconds": 120},
        ],
    },
    {
        "name": "Interview Preparation",
        "description": "A mock loop: behavioral, technical, system design, then a scenario.",
        "estimatedMinutes": 25,
        "steps": [
            {"id": "s1", "label": "Behavioral question", "kind": "practice", "types": ["interview_question"], "category": "behavioral"},
            {"id": "s2", "label": "Technical question", "kind": "practice", "types": ["interview_question"], "category": "flutter"},
            {"id": "s3", "label": "Full-stack question", "kind": "practice", "types": ["interview_question"], "category": "full stack"},
            {"id": "s4", "label": "System design", "kind": "practice", "types": ["interview_question"], "category": "system design"},
            {"id": "s5", "label": "Scenario", "kind": "practice", "types": ["scenario"]},
            {"id": "s6", "label": "Reflection", "kind": "reflect", "types": []},
        ],
    },
    {
        "name": "CTO Workout",
        "description": "Leadership, incidents, business communication.",
        "estimatedMinutes": 20,
        "steps": [
            {"id": "s1", "label": "CTO question", "kind": "practice", "types": ["interview_question"], "category": "cto"},
            {"id": "s2", "label": "Incident scenario", "kind": "practice", "types": ["scenario"]},
            {"id": "s3", "label": "Explain to the CEO", "kind": "practice", "types": ["technical_topic"]},
            {"id": "s4", "label": "Leadership story", "kind": "practice", "types": ["storytelling_prompt"], "category": "leadership"},
            {"id": "s5", "label": "Debate", "kind": "practice", "types": ["debate"]},
            {"id": "s6", "label": "Reflection", "kind": "reflect", "types": []},
        ],
    },
    {
        "name": "Speaking Only",
        "description": "No learning, just talking. Four rounds.",
        "estimatedMinutes": 15,
        "steps": [
            {"id": "s1", "label": "Speaking topic", "kind": "practice", "types": ["speaking_topic"]},
            {"id": "s2", "label": "Story", "kind": "practice", "types": ["storytelling_prompt"]},
            {"id": "s3", "label": "Debate", "kind": "practice", "types": ["debate"]},
            {"id": "s4", "label": "Quick round", "kind": "practice", "types": ["quick_speaking"]},
        ],
    },
    {
        "name": "Technical Workout",
        "description": "Explain, get tested, learn, explain again.",
        "estimatedMinutes": 20,
        "steps": [
            {"id": "s1", "label": "Tech talk", "kind": "practice", "types": ["technical_topic"]},
            {"id": "s2", "label": "Technical interview question", "kind": "practice", "types": ["interview_question"], "category": "full stack"},
            {"id": "s3", "label": "System design question", "kind": "practice", "types": ["interview_question"], "category": "system design"},
            {"id": "s4", "label": "Learn one concept", "kind": "learn", "types": ["technical_topic"]},
            {"id": "s5", "label": "AI question", "kind": "practice", "types": ["interview_question"], "category": "ai engineer"},
        ],
    },
    {
        "name": "10-Minute Quick Session",
        "description": "When you only have ten minutes.",
        "estimatedMinutes": 10,
        "steps": [
            {"id": "s1", "label": "60-second burst", "kind": "practice", "types": ["quick_speaking"], "durationSeconds": 60},
            {"id": "s2", "label": "Interview question", "kind": "practice", "types": ["interview_question"], "durationSeconds": 120},
            {"id": "s3", "label": "Explain one concept", "kind": "practice", "types": ["technical_topic", "knowledge_topic"], "durationSeconds": 120},
            {"id": "s4", "label": "Reflection", "kind": "reflect", "types": []},
        ],
    },
    {
        "name": "30-Minute Deep Practice",
        "description": "Long-form: podcast, debate, story, then learn.",
        "estimatedMinutes": 30,
        "steps": [
            {"id": "s1", "label": "Podcast segment", "kind": "practice", "types": ["podcast_topic"], "durationSeconds": 600},
            {"id": "s2", "label": "Debate", "kind": "practice", "types": ["debate"]},
            {"id": "s3", "label": "Story", "kind": "practice", "types": ["storytelling_prompt"]},
            {"id": "s4", "label": "Tech talk", "kind": "practice", "types": ["technical_topic"]},
            {"id": "s5", "label": "Learn one concept", "kind": "learn", "types": ["technical_topic", "knowledge_topic"]},
            {"id": "s6", "label": "Reflection", "kind": "reflect", "types": []},
        ],
    },
]

DEFAULT_GOALS = [
    {"title": "Speak 20 minutes every day", "metric": "speaking_minutes", "target": 20, "period": "day"},
    {"title": "5 interview questions a week", "metric": "interview_questions", "target": 5, "period": "week"},
    {"title": "3 storytelling exercises a week", "metric": "stories", "target": 3, "period": "week"},
    {"title": "Learn 5 concepts a week", "metric": "concepts_learned", "target": 5, "period": "week"},
]


async def seed_user(db: AsyncSession, user_id: str) -> ImportSummary:
    ts = now_ms()
    has_templates = (await db.execute(select(SessionTemplate.id).where(SessionTemplate.user_id == user_id, SessionTemplate.built_in.is_(True)))).first()
    if not has_templates:
        for i, t in enumerate(BUILT_IN_TEMPLATES):
            db.add(
                SessionTemplate(
                    id=new_id(), user_id=user_id, name=t["name"], description=t["description"], estimated_minutes=t["estimatedMinutes"],
                    steps=t["steps"], built_in=True, position=i, created_at=ts, updated_at=ts,
                )
            )
    has_goals = (await db.execute(select(Goal.id).where(Goal.user_id == user_id))).first()
    if not has_goals:
        for g in DEFAULT_GOALS:
            db.add(Goal(id=new_id(), user_id=user_id, title=g["title"], metric=g["metric"], target=g["target"], period=g["period"], active=True, created_at=ts))
    await db.commit()

    total = ImportSummary()
    seed_dir = Path(get_settings().seed_dir)
    for f in sorted(seed_dir.glob("*.json")) if seed_dir.exists() else []:
        data = json.loads(f.read_text())
        if isinstance(data, list):
            data = {"content": data}
        parsed = ImportFile.model_validate(data)
        s = await import_file(db, user_id, parsed, "seed")
        total.content += s.content
        total.resources += s.resources
        total.vocabulary += s.vocabulary
        total.collections += s.collections
        total.books += s.books
        total.skipped_duplicates += s.skipped_duplicates
    return total
