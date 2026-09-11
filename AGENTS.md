# Quizmon repository guide

Quizmon is a local-first Pokémon knowledge game built with React, TypeScript,
and Vite. Player settings, scores, and Trainer progress stay in the browser. A
small Cloudflare Worker serves the SPA and handles analytics, sprite proxying,
and daily push reminders.

## Start here

- `README.md` covers setup, data updates, attribution, and public project facts.
- `.agents/context/PRODUCT.md` is the product and behavior source of truth.
- `.agents/context/DESIGN.md` defines the visual system. Read it before UI work.
- `wrangler.jsonc` and `.github/workflows/ci.yml` define production deployment.

## Repository structure

| Path                                | Purpose                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `src/main.tsx`, `src/app/`          | Browser entry, app composition, navigation, layout, and providers                 |
| `src/features/`                     | Settings, quiz play, Daily, League, trainer, sharing, installation, and reminders |
| `src/domain/`                       | Pure Pokémon, quiz, settings, and player models and rules                         |
| `src/components/`, `src/hooks/`     | Shared UI controls and React hooks                                                |
| `src/lib/`                          | Browser persistence, audio, analytics, and platform utilities                     |
| `src/styles/`                       | Global foundations and fonts                                                      |
| `src/sw.ts`, `worker/`              | Service worker and Cloudflare Worker routes and reminders                         |
| `build/`, `scripts/`                | Build-time metadata, site assets, and catalog maintenance                         |
| `content/`                          | Public information and legal-page Markdown                                        |
| `art/`, `src/assets/`, `public/`    | Source art and shipped static assets                                              |
| `src/**/*.test.*`, `tests/`, `e2e/` | Colocated unit tests, shared fixtures and tooling/Worker tests, browser tests     |

`src/main.tsx` mounts `src/app/App.tsx`, which connects feature hooks to domain rules
and browser persistence. `worker/index.ts` handles analytics, reminder, and
sprite routes, then delegates other requests to the static asset binding.
`src/sw.ts` supplies offline navigation, media caching, and push handling.

Feature components, hooks, styles, and unit tests live with their owning feature.
Pure domain modules do not import React, feature code, or browser persistence.
Components use PascalCase filenames, hooks use `useCamelCase`, and other modules
use descriptive kebab-case names. Import the owning module directly rather than
adding forwarding files at old paths. Persisted keys and backup formats stay stable
when source names change.

## Commands

Run commands from the repository root.

| Task                        | Command                                                   |
| --------------------------- | --------------------------------------------------------- |
| Set up a fresh clone        | `mise run setup`                                          |
| Start Vite                  | `npm run dev`                                             |
| Run one unit test           | `npm test -- src/domain/quiz/question-generation.test.ts` |
| Run one browser spec        | `npm run test:e2e -- e2e/training.spec.ts`                |
| Lint all source             | `npm run lint`                                            |
| Build production output     | `npm run build`                                           |
| Validate the Worker bundle  | `npm run deploy:dry-run`                                  |
| Run the complete local gate | `mise run check`                                          |
| Refresh Pokémon data        | `npm run data:update`                                     |
| Export badge art            | `mise run badges:export`                                  |

`mise run setup` also installs the Git hooks. Pre-commit checks formatting,
lint, and secrets; pre-push runs the complete gate. Use conventional commit
messages.

## Deployment

Pull requests and pushes to `main` run `.github/workflows/ci.yml`. A push to `main`
deploys to Cloudflare Workers only after the checks pass. The workflow builds
`dist/`, then Wrangler uploads the Worker and its static assets.

`wrangler.jsonc` configures static pages with a 404 fallback, the `quizmon_events` Analytics Engine
dataset, the `DAILY_REMINDERS` Durable Object, and the required
`VAPID_PRIVATE_KEY`. Production credentials live in GitHub's `production`
environment as `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and
`VAPID_PRIVATE_KEY`. CI writes the VAPID secret to a temporary runner file and
passes it to Wrangler with `--secrets-file`. Never commit secret values or
secret files. `mise run deploy` requires Wrangler authentication and an
existing `VAPID_PRIVATE_KEY` binding; CI is the production deployment path.

## Generated and durable files

- Do not edit `dist/`; it is ignored production output.
- `src/domain/pokemon/data/pokemon.json` is generated by `npm run data:update`.
- `art/badges.aseprite` is the badge master. Its slice names determine the PNG
  filenames produced by `mise run badges:export`; Aseprite is required.
- Keep browser behavior independent of live PokéAPI requests. The shipped
  catalog is the gameplay data source; the Worker proxies supported sprite
  assets separately.
- `npm run dev` proxies sprite requests only. It does not emulate the Worker
  APIs; verify Worker changes with `tests/worker.test.ts` and
  `npm run deploy:dry-run`.
- Preserve unrelated working-tree changes and stage task files explicitly.
