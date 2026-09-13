# Sharpr

**Get your brain back.**

Sharpr is an open-source, self-hosted training gym for people who feel their attention, memory and speech have gone soft from years of scrolling. It does not feed you content. It makes you *produce*: retrieve an idea from memory, explain it out loud with a timer running, listen back, find the gaps, learn, and try again.

> **Discover → Speak → Learn → Review → Repeat → Improve**

No AI in the loop, no accounts on someone else's server, no gamification. One `docker compose up` and it is yours.

[![CI](https://github.com/iamnabink/sharpr/actions/workflows/ci.yml/badge.svg)](https://github.com/iamnabink/sharpr/actions/workflows/ci.yml)
[![Docker Hub](https://img.shields.io/docker/v/iamnabink/sharpr-api?label=docker%20hub&sort=semver)](https://hub.docker.com/r/iamnabink/sharpr-api)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)

## Install with Docker Compose

This is the recommended way to run Sharpr. You need [Docker](https://docs.docker.com/get-docker/) with the Compose plugin (included in Docker Desktop and in Docker Engine on Linux). Images are published for amd64 and arm64, so a Linux server, a Mac, or a Raspberry Pi all work.

### 1. Create a folder

```bash
mkdir sharpr && cd sharpr
```

### 2. Download the compose file and the settings template

```bash
curl -fsSLO https://raw.githubusercontent.com/iamnabink/sharpr/main/compose.yml
curl -fsSL  https://raw.githubusercontent.com/iamnabink/sharpr/main/.env.example -o .env
```

`compose.yml` defines three services; `.env` holds your settings. Every value in `.env` has a working default, so you can skip editing it for a first run.

### 3. Start it

```bash
docker compose up -d
docker compose ps
```

All three services should show `running` (the database becomes `healthy` first, then the API starts). Open **http://localhost:3000** and create the first account: it becomes the admin, and every account starts with the bundled library of 155 prompts, vocabulary, collections, books and session templates.

| URL | What |
|---|---|
| http://localhost:3000 | The app |
| http://localhost:3000/docs | API reference (OpenAPI) |
| http://localhost:3000/admin | Table admin, admin accounts only |

### What is running

| Service | Image | Role |
|---|---|---|
| `db` | `postgres:16-alpine` | PostgreSQL. Stores accounts, content, attempts, reviews, goals, everything except recording files. Not exposed outside Docker. |
| `api` | `iamnabink/sharpr-api` | FastAPI backend. Runs database migrations on start, serves `/api`, stores recordings. |
| `web` | `iamnabink/sharpr-web` | Next.js app. The only published port. Proxies `/api`, `/docs` and `/admin` to the API internally. |

Two named volumes hold all state:

| Volume | Contents |
|---|---|
| `db_data` | The PostgreSQL data directory. |
| `sharpr_data` | Recording files under `recordings/`, and `secret_key` (see below). |

### The database

- **Credentials** default to `sharpr` / `sharpr` / database `sharpr`. Both `db` and `api` read them from `.env`, so changing `POSTGRES_PASSWORD` there changes both sides. Change it **before** the first start; after that PostgreSQL has already initialised with the old password and you would need `docker compose down -v` (which deletes data) or an `ALTER USER` inside the container.
- **Not exposed.** `compose.yml` publishes no database port. The defaults are safe on a laptop or a private server because only containers on the compose network can reach it. Set a real password if you publish port 5432 or run other people's containers on the same host.
- **Connect with a tool** (psql, TablePlus, DBeaver): either run `docker compose exec db psql -U sharpr sharpr`, or add `ports: ["127.0.0.1:5432:5432"]` to the `db` service and connect to localhost.
- **Migrations** run automatically when the `api` container starts (`alembic upgrade head`). Updating to a newer image updates the schema; no manual step.
- **Backup**: `docker compose exec -T db pg_dump -U sharpr sharpr > sharpr-$(date +%F).sql`
- **Restore** into a fresh install: `docker compose exec -T db psql -U sharpr sharpr < sharpr-2026-09-13.sql`
- **Full reset**: `docker compose down -v` deletes both volumes, including recordings.

### The secret key

`SECRET_KEY` signs login sessions. Leave it empty in `.env` and the API generates a random key on first start and stores it as `secret_key` inside the `sharpr_data` volume, so sessions survive restarts and updates. Set it yourself only if you run more than one API instance or want to control rotation. Changing it logs everyone out.

### Recordings

By default recordings live in the `sharpr_data` volume. Audio is about 1 MB per minute, 720p video 2–3 MB per minute; `MAX_UPLOAD_MB` (default 500) caps a single recording. To use object storage instead, set `STORAGE_BACKEND=s3` and the `S3_*` values in `.env`; MinIO, Cloudflare R2 and AWS S3 all work. Recordings are streamed back through the API with range support, so they are never publicly readable.

### Settings reference (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `SHARPR_PORT` | `3000` | Host port for the app. |
| `SHARPR_TAG` | `latest` | Image tag: `latest`, a version like `v1.0.0`, or a commit sha. |
| `SECRET_KEY` | *(generated)* | Session signing key. See above. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `sharpr` | Database credentials. |
| `ALLOW_REGISTRATION` | `true` | Set `false` after creating your accounts. The first account can always be created. |
| `COOKIE_SECURE` | `false` | Set `true` when served over HTTPS. |
| `MAX_UPLOAD_MB` | `500` | Largest recording accepted. |
| `STORAGE_BACKEND` | `local` | `local` or `s3`. |
| `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION` | | Only for `STORAGE_BACKEND=s3`. |

After editing `.env`, apply it with `docker compose up -d`.

### Updating

```bash
docker compose pull
docker compose up -d
```

Migrations run automatically. Pin a version with `SHARPR_TAG=v1.0.0` in `.env` if you prefer to update deliberately; tags are listed on [Docker Hub](https://hub.docker.com/r/iamnabink/sharpr-api/tags).

### Stopping, logs, removal

```bash
docker compose logs -f          # follow logs
docker compose stop             # stop, keep everything
docker compose down             # remove containers, keep data volumes
docker compose down -v          # remove containers AND all data
```

### Behind a domain (HTTPS)

Put a reverse proxy in front of port 3000 and set `COOKIE_SECURE=true`. Only one port needs to be exposed because the web container proxies the API. A minimal Caddy example:

```
sharpr.example.com {
    reverse_proxy localhost:3000
}
```

Then set `ALLOW_REGISTRATION=false` once your accounts exist.

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

For contributors. `docker-compose.yml` in the repo builds the images from the checkout; `compose.yml` is the end-user file above.

```bash
git clone https://github.com/iamnabink/sharpr.git && cd sharpr
./start.sh              # build the images locally and start the full stack (data in ./data)
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
