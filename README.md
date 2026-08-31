# Quizmon

The ultimate Pokémon knowledge test.

Quizmon is a browser game for identifying Pokémon against the clock. Filter by
generation and form, enable silhouette or random-sprite challenges, and compare
scores across runs.

## Development

Install the locked tools and project dependencies, then start Vite:

```sh
mise install
npm ci
mise run hooks:install
mise run dev
```

Run every repository check with:

```sh
mise run check
```

Install Chromium once and run the browser tests with:

```sh
npx playwright install chromium
mise run e2e
```

Commits follow the [Conventional Commits](https://www.conventionalcommits.org/)
format. Prek checks formatting and linting before each commit, validates commit
messages locally, and runs the same checks in CI.

## Pokémon data

The catalog is checked in so builds and gameplay do not depend on a bulk API
request. Refresh Generation IX defaults from PokéAPI with:

```sh
mise run data:update
```

Individual Pokémon details and sprites are loaded from PokéAPI during play.

## Deployment

Pushes to `master` deploy the Vite build as static assets on Cloudflare Workers.
The `quizmon.raveh.dev` custom domain is managed in the
[`infra`](https://github.com/itay-raveh/infra) repository.
