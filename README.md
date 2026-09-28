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

The local account service uses PostgreSQL, and RxServer syncs account saves through MongoDB. `npm run dev` starts both databases. Completed rounds are archived once, and account progress and Pokédex entries are derived from those rounds. Unfinished rounds stay in the browser.

## Question configuration

The [question configuration API](.agents/context/QUESTION_RULES.md) covers family controls, rendering, level selection, and saved-question behavior.

## Sentry

Production releases send browser errors, player feedback, traces, and game metrics to the browser Sentry project. Worker errors and traces use a separate project. Guests have no Quizmon account identity in Sentry; a verified signed-in session supplies its account ID and email for diagnostics. Game metrics omit account identity. Sentry is optional for loading, play, and saving.

Set the GitHub Actions secrets `SENTRY_BROWSER_DSN`, `SENTRY_WORKER_DSN`, `SENTRY_ORG`, `SENTRY_BROWSER_PROJECT`, `SENTRY_WORKER_PROJECT`, and `SENTRY_AUTH_TOKEN`. The token needs Sentry's `org:ci` scope for source map uploads. The release stops if a secret or upload is missing. Browser maps are uploaded and deleted from `dist/`; the checked Worker bundle and its map are uploaded before the same bundle is deployed. Local development and tests do not send Sentry events.

## Data

Quizmon builds an offline catalog from two sources. [PokéAPI](https://pokeapi.co/) owns stable species and form IDs, names, Pokédex details, EV yields, game versions, evolutions, locations, encounters, berries, bag-item uses, and sprite metadata. [@pkmn/dex](https://github.com/pkmn/ps/tree/main/dex) owns types, matchups, stats, abilities, level-up moves, natures, move battle properties, and battle effect descriptions. PokéAPI supplies the game-version contexts for moves; Showdown supplies their type and damage class in each generation. Missing Showdown abilities and move facts are omitted, while an unmapped species stops the update. Neither source silently fills the other's facts. Live games do not request either source.

```sh
npm run data:update
```

Run `npm run data:update -- --showdown-only` to refresh packaged Showdown battle data without fetching PokéAPI again. Run a full update to discover new PokéAPI game-version contexts and forms, and to recheck ability disagreements between the sources.

The build fetches the trainer sprites listed in `src/domain/player/data/trainer-avatars.json` from [Pokémon Showdown](https://play.pokemonshowdown.com/sprites/trainers/) and verifies their checksums before Vite copies them into `dist/`. The PNGs stay ignored in Git. Run `npm run avatars:prepare` for local development, or `npm run avatars:update` to refresh the tracked manifest from the current uncredited 80 × 80 sprite index.

## Licenses

Quizmon's original code is source-available under the [Apache License 2.0 with Commons Clause](LICENSE). Keep the [NOTICE](NOTICE) with redistributed copies. This license does not cover third-party artwork, data, trademarks, or separately licensed text. See the [Terms of Use](content/terms.md) for credits.
