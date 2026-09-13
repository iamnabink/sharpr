# Contributing to Sharpr

Thanks for helping people get their brains back. Sharpr is small on purpose: one API, one web app, one compose file. Keep it that way.

## Ways to contribute

- **Content packs.** The most valuable contribution. Write or generate prompts in the [import format](docs/IMPORT_SCHEMA.md) and open a PR adding a JSON file under `apps/api/seed/` (bundled for every new account) or `content-packs/` (opt-in, imported from Library → Import). Quality bar: specific, mature, no filler. Technical material must be correct.
- **Bugs and fixes.** Open an issue with steps to reproduce. PRs welcome.
- **Features.** Open an issue first so we agree on the shape. The product principle is fixed: *retrieve → speak → discover weaknesses → learn → try again*. Features that just show content, or that gamify, will not be merged.

## Development

```bash
./start.sh --dev  # Postgres in Docker, API with reload on :8000, web on :3000
./start.sh        # the full containerized stack, as a server runs it
./stop.sh         # stop either
```

Before a PR:

```bash
cd apps/web && npm run typecheck && npm run lint
cd apps/api && ruff check app && python -m compileall -q app
```

Docker images are built and published by CI; you never need to push images by hand. Test the containerized stack with `./start.sh` before opening a PR that touches a Dockerfile or the compose files.

Schema changes need an Alembic migration (`alembic revision --autogenerate -m "..."` in `apps/api`). API JSON is camelCase; timestamps are epoch milliseconds; every table row is scoped by `user_id`.

## Cutting a release

Releases are tagged `vMAJOR.MINOR.PATCH`. Land changes through pull requests labeled `feature`, `bug`, `content`, `docs`, `ci` and so on: GitHub builds the release notes from merged PRs using `.github/release.yml`, so direct pushes to `main` do not show up in them.

```bash
gh release create v1.1.0 --generate-notes --title "Sharpr v1.1.0" compose.yml
```

The tag triggers the publish workflow, which pushes `iamnabink/sharpr-api` and `iamnabink/sharpr-web` tagged `1.1.0`, `v1.1.0` and `latest`. Attach `compose.yml` so the release page has everything an installer needs.

## No AI in the core loop

Sharpr must stay fully useful without any AI service. AI features (speech-to-text, scoring, an AI interviewer) are welcome as **optional, clearly separated** additions that degrade gracefully when not configured. See the roadmap in the README.

## License

By contributing you agree your work is released under the MIT License.
