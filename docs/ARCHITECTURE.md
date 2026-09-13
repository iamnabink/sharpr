# Sharpr architecture

## Services

```
docker compose
├── db     PostgreSQL 16                     volume: pgdata
├── api    FastAPI  :8000                    volume: ./data/recordings → /data/recordings
├── web    Next.js  :3000  (proxies /api, /docs, /admin → api)
└── minio  optional S3-compatible storage    profile: s3
```

The browser only talks to the web origin. Next.js rewrites forward `/api/v1/*`, `/docs`, `/openapi.json` and `/admin/*` to the API container, so cookies are first-party, CORS is unnecessary and media streaming works without extra headers. The rewrite target comes from `API_INTERNAL_URL`, which Next.js resolves at build time: it is a Docker build argument (default `http://api:8000`) and an env var for local `npm run dev` / `./start.sh --dev` (default `http://localhost:8000`). Set `NEXT_PUBLIC_API_URL` only if the browser must reach the API on a different domain (the API's `CORS_ORIGINS` then matters).

## Images and deployment

GitHub Actions (`.github/workflows/publish.yml`) builds `iamnabink/sharpr-api` and `iamnabink/sharpr-web` for linux/amd64 and linux/arm64 on every push to `main` (tag `latest` + commit sha) and on `v*` tags (semver tag). End users run `docker-compose.hub.yml`, which references those images and has no build sections; `docker-compose.yml` in the repo carries both `image:` and `build:` so contributors can build locally (`./start.sh`) or pull (`./start.sh --pull`). Publishing needs the repo secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`; without them the workflow skips.

## Repository layout

```
apps/api/
  app/core/        config (env), db session, ids, security (argon2 + JWT)
  app/models/      SQLAlchemy models: user, content, learning, practice
  app/schemas/     Pydantic (camelCase aliases) + the import contract (snake_case)
  app/routers/     auth, content, resources, collections, vocabulary, books, notes, goals,
                   settings, attempts (+recordings), retry, sessions, engine, importing
  app/services/    storage (local/s3), importer, seed, content_mapper
  app/engine/      random_engine, retry, stats  (deterministic rules, no AI)
  app/admin.py     sqladmin views at /admin (admin role)
  alembic/         migrations (0001 creates all tables from models)
  seed/*.json      bundled content in import format
apps/web/
  src/app/         routes (all client components)
  src/components/  shell (AppShell, AuthForm), ui, practice (PracticeRunner, ReviewForm, LearnPanel, TypeHub), library
  src/lib/api/     client.ts (typed fetch), hooks.ts (TanStack Query), auth.tsx (provider + redirects)
  src/lib/content/ TypeScript types shared with API JSON, review helpers, export helpers
  src/lib/engine/  client-side presets and retry helpers
  src/lib/recording/useRecorder.ts   MediaRecorder wrapper
docs/              this file, IMPORT_SCHEMA.md, PRODUCT_SPEC.md
```

## Auth

Email + password (argon2). Login returns a JWT (HS256, 30 days) set as an httpOnly `sharpr_session` cookie and also in the body for non-browser clients (send `Authorization: Bearer`). The first registered user is `admin`; `ALLOW_REGISTRATION=false` closes sign-ups afterwards. Every table row carries `user_id`; every query is scoped to the current user.

## Data model

All timestamps are epoch milliseconds (BIGINT) so the web types need no conversion. IDs are 12-char URL-safe strings.

| table | notes |
|---|---|
| users | email, argon2 hash, role user/admin |
| content | typed columns (type, title, prompt, category, difficulty, durations, tags[], status, bookmarked, track, book_id) + `data` JSONB for type-specific fields (guiding questions, learning material, counterarguments, podcast structure, scenario role) |
| resources, content_resources | learning resources, many-to-many with content |
| collections, collection_items | named groups |
| vocabulary | words/phrases; `times_used` increments when assigned in a challenge |
| books | book + notes/ideas/quotes/concepts/prompts |
| attempts | one per practice pass; snapshot of content title/category; `review` JSONB; recording_id |
| recordings | metadata + `storage_key`; bytes live in storage |
| retry_queue | content_id, due_at, status pending/done/dismissed |
| session_templates, session_runs | built-in templates seeded per user; runs store chosen content ids and attempt ids |
| goals, notes, settings | per-user |

## API surface (prefix `/api/v1`)

- `auth`: register, login, logout, me, config
- `content`: list (filters: type, status, category, track, tag, difficulty, bookmarked, bookId, q), CRUD, duplicate, bulk (archive/unarchive/delete/duplicate/bookmark)
- `resources`, `collections`, `vocabulary`, `books`, `notes`, `goals`: CRUD
- `settings`: key/value per user
- `attempts`: list, history index, create, review (PATCH), delete; `POST /attempts/{id}/recording` multipart upload; `GET /recordings/{id}/stream` with HTTP Range support
- `retry`: list/add/update/delete
- `session-templates`, `session-runs`: templates CRUD + duplicate; runs are created from a template (engine fills each step) or from explicit content ids (mock interviews)
- `random`, `random/many`, `daily`, `stats`: the engine
- `import/validate`, `import`, `import/file`, `seed`, `export`, `export/backup`

Full schema at `/docs`.

## Engine rules

- **Random**: filter, then weight. Never practiced ×3, retry due ×4, last rating < 6 ×2.5, bookmarked ×1.5, practiced within 7 days ×0.15 decaying to ×1 at 30 days, older than 30 days ×1.3. `daily` caches one pick per slot per local date in settings.
- **Retry**: recommended when overall < 6 or ≥ 3 flags; suggested interval by score; practicing an item marks its pending retry done.
- **Stats**: computed per request from attempts (tz offset passed by the client).

## Recording storage

`services/storage.py` defines a `Storage` protocol with `LocalStorage` (volume) and `S3Storage` (boto3; MinIO, R2, S3). Keys are `<user_id>/<recording_id>.<ext>`. Uploads are capped by `MAX_UPLOAD_MB`. Streaming honours Range requests so `<video>` seeking works.

## Adding AI later

- Speech-to-text: a worker that reads `recordings` rows, pulls bytes from storage and writes a `transcripts` table (attempt_id, text, words with timings).
- Filler-word and pace analysis: derived from transcripts; store as `analysis` JSONB on the attempt, shown beside the manual review.
- Automatic scores: write a second review with `source: "ai"`; keep the manual one authoritative.
- AI interviewer / voice mode: a new content type or dynamically generated session runs; the runner accepts any content item.
- Flutter client: the API is cookie-or-bearer and camelCase JSON; nothing in the web app is required.

## Migrations

`alembic upgrade head` runs on container start. To change the schema: edit models, then `alembic revision --autogenerate -m "..."` inside `apps/api`, review the file, commit it.
