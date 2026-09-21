<p align="center">
  <img src="https://quizmon.raveh.dev/assets/images/logo.png" alt="Quizmon" width="480">
</p>

<p align="center">
  <a href="https://quizmon.raveh.dev/">Play Quizmon</a>
</p>

Quizmon is a browser game about Pokémon sprites, descriptions, types, matchups, abilities, moves, evolutions, stats, etc.

[How to play](content/about.md) explains the Daily Challenge, Training, scoring, badges, and Quizmon League.

## Run Quizmon locally

Setup using [mise](https://mise.jdx.dev/):

```sh
mise run setup
npm run dev
```

Optional accounts sync completed progress and add friends and Daily leaderboards. Local development requires Docker. The [Helm chart](charts/quizmon/) packages the online services; `deploy/` contains their release tooling.

## Sentry

Production releases send browser errors, bug reports, masked error replays, traces, and game metrics to the browser Sentry project. Worker errors and traces use a separate project. Guests have no Quizmon account identity in Sentry; a verified signed-in session supplies its account ID and email. Sentry is optional for loading, play, and saving.

Set the GitHub Actions secrets `SENTRY_BROWSER_DSN`, `SENTRY_WORKER_DSN`, `SENTRY_ORG`, `SENTRY_BROWSER_PROJECT`, `SENTRY_WORKER_PROJECT`, and `SENTRY_AUTH_TOKEN`. The token needs Sentry's `org:ci` scope for source map uploads. The release stops if a secret or upload is missing. Browser maps are uploaded and deleted from `dist/`; the checked Worker bundle and its map are uploaded before the same bundle is deployed. Local development and tests do not send Sentry events.

## Data

Quizmon builds an offline dataset of Pokémon species and selected forms from [PokéAPI](https://pokeapi.co/). Ability effect choices use short descriptions from [Pokémon Showdown](https://github.com/smogon/pokemon-showdown), with generation-specific mechanics and fuller explanations available after answering. The importer pins its source revision in `scripts/ability-text.ts`. Live games do not request either source.

```sh
npm run data:update
```

The build fetches uncredited 80 × 80 trainer sprites from [Pokémon Showdown's trainer sprite index](https://play.pokemonshowdown.com/sprites/trainers/) and generates the avatar catalog. Sprite PNGs are ignored in Git and copied into `dist/` by Vite. Run `npm run avatars:update` to refresh the catalog for local development.

## Licenses

The code uses the [MIT License](LICENSE). See the [Terms of Use](content/terms.md) for third-party credits and legal notices.
