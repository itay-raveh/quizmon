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

The local account service uses `quizmon` and a separate `powersync` bucket database. `npm run dev` creates them if needed. Completed rounds are archived once, and account progress and Pokédex entries are derived from those rounds. Unfinished rounds stay in the browser.

## Sentry

Production releases send browser errors, bug reports, masked error replays, traces, and game metrics to the browser Sentry project. Worker errors and traces use a separate project. Guests have no Quizmon account identity in Sentry; a verified signed-in session supplies its account ID and email. Sentry is optional for loading, play, and saving.

Set the GitHub Actions secrets `SENTRY_BROWSER_DSN`, `SENTRY_WORKER_DSN`, `SENTRY_ORG`, `SENTRY_BROWSER_PROJECT`, `SENTRY_WORKER_PROJECT`, and `SENTRY_AUTH_TOKEN`. The token needs Sentry's `org:ci` scope for source map uploads. The release stops if a secret or upload is missing. Browser maps are uploaded and deleted from `dist/`; the checked Worker bundle and its map are uploaded before the same bundle is deployed. Local development and tests do not send Sentry events.

## Data

Quizmon builds an offline dataset of Pokémon species and selected forms from [PokéAPI](https://pokeapi.co/). The importer uses [@pkmn/dex](https://github.com/pkmn/ps/tree/main/dex) for generation-specific ability and held-item effects and move descriptions. It derives medicine choices from PokéAPI item effects. The lockfile pins the packaged Showdown data. Live games do not request either source.

```sh
npm run data:update
```

Run `npm run data:update -- --pkmn-only` to refresh packaged Showdown descriptions without fetching PokéAPI again.

The build fetches the trainer sprites listed in `src/domain/player/data/trainer-avatars.json` from [Pokémon Showdown](https://play.pokemonshowdown.com/sprites/trainers/) and verifies their checksums before Vite copies them into `dist/`. The PNGs stay ignored in Git. Run `npm run avatars:prepare` for local development, or `npm run avatars:update` to refresh the tracked manifest from the current uncredited 80 × 80 sprite index.

## Licenses

The code uses the [MIT License](LICENSE). See the [Terms of Use](content/terms.md) for third-party credits and legal notices.
