# Quizmon repository guide

Quizmon is a local-first Pokémon knowledge game built with React, TypeScript, and Vite. Guest progress stays in the browser; optional accounts sync completed progress and selected preferences across devices. Unfinished rounds stay on the device. A small Cloudflare Worker serves the SPA and handles analytics, sprite proxying, and daily push reminders.

## Start here

- `README.md` covers setup, data updates, attribution, and public project facts.
- `.agents/context/PRODUCT.md` is the product and behavior source of truth.
- `.agents/context/DESIGN.md` defines the visual system. Read it before UI work.
- `wrangler.jsonc` and `.github/workflows/ci.yml` define production deployment.

## Documentation

- Do not create `docs/` or another documentation directory without the user's explicit approval of that path.
- Keep task-relevant documentation in the existing `README.md` and `.agents/context/` files.
- Feature approval does not authorize reorganizing documentation. Ask before moving documentation or introducing a new documentation structure.

## Repository structure

| Path | Purpose |
| --- | --- |
| `src/main.tsx`, `src/app/` | Browser entry, app composition, navigation, layout, and providers |
| `src/features/` | Settings, quiz play, Daily, League, trainer, sharing, installation, and reminders |
| `src/domain/` | Pure Pokémon, quiz, settings, and player models and rules |
| `src/components/`, `src/hooks/` | Shared UI controls and React hooks |
| `src/lib/` | Browser persistence, audio, analytics, and platform utilities |
| `src/styles/` | Global foundations and fonts |
| `src/sw.ts`, `worker/` | Service worker and Cloudflare Worker routes and reminders |
| `build/`, `scripts/` | Build-time metadata, site assets, and catalog maintenance |
| `server/`, `deploy/`, `charts/` | Account API, database migrations, release tooling, and Helm chart |
| `content/` | Public information and legal-page Markdown |
| `art/`, `src/assets/`, `public/` | Source art and shipped static assets |
| `src/**/*.test.*`, `tests/` | Colocated unit tests, shared fixtures and tooling/Worker tests |

`src/main.tsx` mounts `src/app/App.tsx`, which connects feature hooks to domain rules and browser persistence. `worker/index.ts` handles analytics, reminder, and sprite routes, then delegates other requests to the static asset binding. `src/sw.ts` supplies offline navigation, media caching, and push handling.

Feature components, hooks, styles, and unit tests live with their owning feature. Pure domain modules do not import React, feature code, or browser persistence. Components use PascalCase filenames, hooks use `useCamelCase`, and other modules use descriptive kebab-case names. Import the owning module directly rather than adding forwarding files at old paths. Persisted keys and backup formats stay stable when source names change.

## Commands

Run commands from the repository root.

| Task | Command |
| --- | --- |
| Set up a fresh clone | `mise run setup` |
| Start the app and local services | `npm run dev` |
| Run one unit test | `npm test -- src/domain/quiz/scoring.test.ts` |
| Run fast push tests | `npm run test:push` |
| Lint all source | `npm run lint` |
| Build production output | `npm run build` |
| Validate the Worker bundle | `npm run deploy:dry-run` |
| Run the complete local gate | `mise run check` |
| Refresh Pokémon data | `npm run data:update` |
| Export badge art | `mise run badges:export` |

`mise run setup` also installs the Git hooks. Pre-commit checks changed-file formatting and lint, secrets, and Helm chart changes; pre-push runs fast game tests. Run `mise run check` for the complete gate. Use conventional commit messages.

## Testing philosophy

Write the smallest deterministic test that would catch a meaningful regression. Prioritize unit tests for game rules, scoring, progression, question generation, saved-data validation, and other nontrivial logic; assert exact numeric results when those numbers are the rule being tested. Derive fixtures from shared definitions instead of hardcoding game versions. Add a focused component test only for complex UI state or interaction that cannot be covered at the logic boundary, and assert the behavior or state change rather than exact screen prose, incidental DOM structure, or displayed fixture numbers. Do not add Playwright tests for now. Keep Worker, account and sync, migration, Helm, and other focused integration checks when they prove a contract that unit tests cannot, without repeating every lower-level case. Keep pre-push fast by running game unit tests; move valuable slow checks to CI rather than deleting them to meet a rigid time limit. Tests should survive unrelated copy, data, and version changes. This follows [behavior-focused unit testing](https://abseil.io/resources/swe-book/html/ch12.html) and the [practical test pyramid](https://martinfowler.com/articles/practical-test-pyramid.html), adapted to this repository.

## Deployment

Pull requests and pushes to `main` run `.github/workflows/ci.yml`. After checks pass, a push to `main` calls `.github/workflows/release.yml` to build, test, and publish the release image. GitHub does not deploy the Worker.

`charts/quizmon/` runs the release image: verify inputs, migrate PostgreSQL under the release lock, configure the PowerSync publication, then deploy and verify the Worker. Infrastructure owns the databases, networking, certificates, Secrets, and Flux configuration. Cloudflare deployment credentials stay in Kubernetes Secrets. Never commit secret values or secret files.

## Generated and durable files

- Do not hard-wrap Markdown prose. Use one source line per paragraph and preserve structural line breaks.

- Never stage or commit specification documents. Keep them local, including files such as `*_SPEC.md`. Do not force-add ignored specs.

- Do not edit `dist/`; it is ignored production output.
- `src/domain/pokemon/data/pokemon.json` is generated by `npm run data:update`.
- `art/badges.aseprite` is the badge master. Its slice names determine the PNG filenames produced by `mise run badges:export`; Aseprite is required.
- Keep browser behavior independent of live PokéAPI requests. The shipped catalog is the gameplay data source; the Worker proxies supported sprite assets separately.
- `npm run dev` starts Vite, the account Worker, PostgreSQL, and PowerSync. Use `npm run dev:client` for the browser alone. Verify Worker changes with `tests/worker.test.ts`, `npm run test:accounts`, and `npm run deploy:dry-run`.
- Preserve unrelated working-tree changes and stage task files explicitly.
