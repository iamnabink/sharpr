# Sharpr

**Get your brain back.**

Sharpr is an open-source, self-hosted training gym for people who feel their attention, memory and speech have gone soft from years of scrolling. It does not feed you content. It makes you *produce*: retrieve an idea from memory, explain it out loud with a timer running, listen back, find the gaps, learn, and try again.

> **Discover → Speak → Learn → Review → Repeat → Improve**

No AI in the loop, no accounts on someone else's server, no gamification. One `docker compose up` and it is yours.

[![CI](https://github.com/iamnabink/sharpr/actions/workflows/ci.yml/badge.svg)](https://github.com/iamnabink/sharpr/actions/workflows/ci.yml)
[![Docker Hub](https://img.shields.io/docker/v/iamnabink/sharpr-api?label=docker%20hub&sort=semver)](https://hub.docker.com/r/iamnabink/sharpr-api)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)

## Quick start (Docker)

Requirements: Docker with Compose. Images are published for amd64 and arm64, so this works on a Linux server, a Mac, or a Raspberry Pi.

```bash
mkdir sharpr && cd sharpr
curl -fsSLO https://raw.githubusercontent.com/iamnabink/sharpr/main/docker-compose.hub.yml
SECRET_KEY=$(openssl rand -hex 32) docker compose -f docker-compose.hub.yml up -d
```

Open **http://localhost:3000** and create the first account. It becomes the admin, and every account starts with the bundled library: 155 prompts, 45 vocabulary items, 4 collections, 3 books, 7 session templates, 4 goals.

| URL | What |
|---|---|
| http://localhost:3000 | The app |
| http://localhost:3000/docs | API reference (OpenAPI) |
| http://localhost:3000/admin | Table admin, admin accounts only |

To keep settings permanent, put them in a `.env` file next to the compose file instead of passing them on the command line:

```ini
SECRET_KEY=change-me-to-a-long-random-string
POSTGRES_PASSWORD=change-me-too
ALLOW_REGISTRATION=false      # set after you have created your accounts
SHARPR_PORT=3000
```

### Everyday commands

```bash
docker compose -f docker-compose.hub.yml pull && docker compose -f docker-compose.hub.yml up -d   # update to the latest images
docker compose -f docker-compose.hub.yml logs -f                                                 # follow logs
docker compose -f docker-compose.hub.yml down                                                    # stop (data is kept)
docker compose -f docker-compose.hub.yml down -v                                                 # stop and delete all data
```

Pin a version with `SHARPR_TAG=v1.0.0` (tags are listed on [Docker Hub](https://hub.docker.com/r/iamnabink/sharpr-api/tags)).

### Configuration

All settings are environment variables read by the API container.

| Variable | Default | Meaning |
|---|---|---|
| `SECRET_KEY` | *(required)* | Signs session tokens. Generate with `openssl rand -hex 32`. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `sharpr` | Database credentials, used by both `db` and `api`. |
| `ALLOW_REGISTRATION` | `true` | Set `false` to close sign-ups. The first account can always be created. |
| `SHARPR_PORT` | `3000` | Host port for the web app. |
| `SHARPR_TAG` | `latest` | Image tag to run. |
| `STORAGE_BACKEND` | `local` | `local` keeps recordings in the `recordings` volume; `s3` uses any S3-compatible service. |
| `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION` | | Only for `STORAGE_BACKEND=s3` (works with MinIO, Cloudflare R2, AWS S3). |
| `COOKIE_SECURE` | `false` | Set `true` when serving over HTTPS. |
| `MAX_UPLOAD_MB` | `500` | Largest recording accepted. |

### Data and backups

- **Database**: the `pgdata` volume. Back it up with `docker compose -f docker-compose.hub.yml exec db pg_dump -U sharpr sharpr > backup.sql`.
- **Recordings**: the `recordings` volume (or your S3 bucket). Audio is roughly 1 MB per minute, 720p video 2–3 MB per minute.
- **Everything except recordings** can also be exported as JSON from Settings inside the app.

### Behind a domain

Put a reverse proxy (Caddy, Nginx, Traefik) in front of port 3000 and set `COOKIE_SECURE=true`. The web container proxies `/api`, `/docs` and `/admin` to the API internally, so only one port needs to be exposed.

## What you train

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

## Why it works

- **Retrieval before reading.** You explain a topic *before* the learning material is revealed. That is where memory is built.
- **Speaking is the test.** Vague understanding survives reading. It does not survive three minutes out loud.
- **Honest self-review.** You rate fluency, clarity, structure and knowledge yourself. Weak topics come back automatically.
- **No AI in the loop.** Nothing is summarized or scored for you; the effort is the point. AI can write the *prompts* (below), and may later assist with review, but the core never depends on it.
- **No gamification.** No guilt streaks, no badges, no confetti. Just numbers that tell the truth.

## Bring your own content

Sharpr has no AI, but your AI can write for it. Ask any model:

> Generate 50 senior Go interview questions as JSON matching the Sharpr import schema.

Give it [`docs/IMPORT_SCHEMA.md`](docs/IMPORT_SCHEMA.md), then paste the result into **Library → Import**. The API validates it and skips duplicates. Export from Settings round-trips to the same format, so content packs are easy to share; PRs with new packs are very welcome.

## Run from source

```bash
git clone https://github.com/iamnabink/sharpr.git && cd sharpr
./start.sh              # build the images locally and start the full stack
./start.sh --pull       # same, but with the prebuilt Docker Hub images
./start.sh --dev        # developer mode: Postgres in Docker, API and web with hot reload
./stop.sh               # stop everything;  ./stop.sh --reset also wipes the database
```

- **API**: FastAPI, SQLAlchemy 2 (async), Alembic, PostgreSQL 16, Pydantic v2, JWT cookie auth, sqladmin, pluggable storage (local volume or S3)
- **Web**: Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, TanStack Query, MediaRecorder
- **Images**: built for amd64 and arm64 by GitHub Actions on every push to `main` and every `v*` tag

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
- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md), the original brief

## License

MIT. Copyright (c) 2026 Nabraj Khadka.
