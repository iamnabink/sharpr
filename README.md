# Sharpr

**Get your brain back.**

Sharpr is an open-source, self-hosted training gym for people who feel their attention, memory and speech have gone soft from years of scrolling. Instead of feeding you more content, it makes you *produce*: retrieve an idea from memory, explain it out loud, hear yourself, find the gaps, learn, and try again.

It started as a personal tool for a senior engineer working toward CTO-level communication and C2 English, and it ships with that content. But the loop works for any self-learner, and the content is entirely yours to define.

> **Discover → Speak → Learn → Review → Repeat → Improve**

## Why it works

- **Retrieval before reading.** You explain a topic *before* the learning material is revealed. That is where memory is actually built.
- **Speaking is the test.** Vague understanding survives reading; it does not survive three minutes out loud with a timer running.
- **Honest self-review.** After each attempt you rate fluency, clarity, structure, knowledge and more. Weak topics come back automatically.
- **No AI in the loop.** Nothing is summarized for you, nothing is scored for you. The effort is the point. AI can generate the *prompts* (see below) and may later assist with review, but the core never depends on it.
- **No gamification.** No streaks-as-guilt, no badges, no confetti. Just numbers that tell the truth.

## What you can train

| Mode | What happens |
|---|---|
| Random | Press one button. The engine picks something you haven't done, did badly, or bookmarked. |
| Speak | Opinion and explanation topics, 2–5 minutes, with guiding questions. |
| Quick | 30, 60 or 120-second bursts for when you only have a moment. |
| Story | Storytelling with frameworks (STAR, Hook → Story → Lesson, …). |
| Podcast | You are the guest. The host opens, pushes with follow-ups, and closes. |
| Debate | Defend or oppose a position; counterarguments are revealed one at a time. |
| Interview | Seven tracks (Flutter, Full Stack, AI Engineer, System Design, CTO, Founder, Behavioral) and mock sessions. |
| Tech Talk | Explain a technology to a beginner, a CTO, an investor, a customer, or without jargon. |
| Scenarios | Role-plays: the database is failing at peak, an investor questions your burn, a senior engineer resigns. |
| Sessions | Structured workouts (20-Minute Daily, CTO Workout, Interview Prep, …) or your own templates. |
| Books | Active-recall prompts after every chapter. Not a tracker. |
| Knowledge | Economics, psychology, history, philosophy, science: what do you already know? |
| Vocabulary | Precise, natural professional language. Get three random words to use in your next challenge. |

Every attempt can be recorded (audio or video), played back, reviewed on twelve dimensions, and scheduled for retry.

## Run it

You need Docker. Fastest, with prebuilt images from Docker Hub (`iamnabink/sharpr-api`, `iamnabink/sharpr-web`, amd64 and arm64):

```bash
mkdir sharpr && cd sharpr
curl -fsSLO https://raw.githubusercontent.com/iamnabink/sharpr/main/docker-compose.hub.yml
SECRET_KEY=$(openssl rand -hex 32) docker compose -f docker-compose.hub.yml up -d
```

Or from source:

```bash
git clone https://github.com/iamnabink/sharpr.git && cd sharpr
./start.sh            # builds locally;  ./start.sh --pull uses the Docker Hub images
```

Open http://localhost:3000 and create the first account (it becomes the admin). Every account gets the bundled starter library: 155 prompts, 45 vocabulary items, 4 collections, 3 books, 7 session templates, 4 goals.

| URL | What |
|---|---|
| http://localhost:3000 | The app |
| http://localhost:3000/docs | API docs (OpenAPI) |
| http://localhost:3000/admin | Table admin (admin accounts only) |

Recordings are stored in `./data/recordings`. For S3-compatible storage set `STORAGE_BACKEND=s3` plus the `S3_*` variables in `.env`, or run `./start.sh --s3` to include MinIO. Set `ALLOW_REGISTRATION=false` once your accounts exist.

`./stop.sh` stops everything (`./stop.sh --reset` also wipes the database); `./start.sh --logs` follows logs.

## Bring your own content

Sharpr has no AI, but your AI can write for it. Ask any model:

> Generate 50 senior Go interview questions as JSON matching the Sharpr import schema.

Give it [`docs/IMPORT_SCHEMA.md`](docs/IMPORT_SCHEMA.md), then paste the result into **Library → Import**. The API validates it and skips duplicates. Export from Settings round-trips to the same format, so content packs are easy to share; PRs with new packs are very welcome.

## Develop

```bash
./start.sh --dev   # Postgres in Docker, API (:8000) with reload, web (:3000) with hot reload
./stop.sh          # stop dev servers and containers
```

- **API**: FastAPI, SQLAlchemy 2 (async), Alembic, PostgreSQL 16, Pydantic v2, JWT cookie auth, sqladmin, pluggable storage (local volume or S3)
- **Web**: Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, TanStack Query, MediaRecorder
- **Deploy**: docker compose (db, api, web, optional minio)

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the data model, API surface and engine rules, and [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a PR.

## Roadmap

Everything below is optional and must degrade gracefully. The core loop stays AI-free.

- [ ] Content packs directory with community-contributed prompt sets
- [ ] Speech-to-text transcripts of recordings (local Whisper worker)
- [ ] Filler-word, pace and vocabulary analysis from transcripts
- [ ] AI-assisted review that sits *beside* your own rating, never instead of it
- [ ] AI interviewer and conversational voice mode
- [ ] Automatic resource recommendations per topic
- [ ] Flutter mobile client (the API is already client-agnostic)
- [ ] Spaced-repetition scheduling beyond the current deterministic retry rules

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/IMPORT_SCHEMA.md`](docs/IMPORT_SCHEMA.md)
- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — the original brief

## License

MIT. Copyright (c) 2026 Nabraj Khadka.
