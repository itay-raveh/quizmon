<p align="center">
  <img src="https://quizmon.raveh.dev/assets/images/logo.png" alt="Quizmon" width="480">
</p>

<p align="center">
  <a href="https://quizmon.raveh.dev/">Play Quizmon</a>
</p>

Quizmon is a free browser game about Pokémon sprites, descriptions, types, matchups, abilities, moves, evolutions, stats, etc. Optional accounts sync completed progress and add friends.

## Run Quizmon locally

Setup using [mise](https://mise.jdx.dev/):

```sh
mise run setup
npm run dev
```

The [Helm chart](charts/quizmon/) packages the online services and `deploy/` contains their release tooling.

## Progress migrations and backups

[RxDB native schema migration](src/lib/storage/rxdb-database.ts) upgrades existing MongoDB and browser collections before reads or sync start, including queued offline facts and replication metadata. Supported older JSON exports pass through the [same transforms](src/lib/storage/rxdb-migrations.ts) on import. Completed device receipts are recovered before cleanup; unfinished lineups restart while spent Daily attempts remain claimed. Newer unsupported exports require a newer app.

Native migration removes superseded collection storage after completion. Before publishing a production schema change, stop writes and verify a fresh recovery backup and its isolated restore. The backup supports rollback if a transform is wrong; normal restoration uses automatic migration.

## Derived trainer cache

The [origin](server/rxdb-sync.ts) clears [derived trainer summaries](server/trainer-summaries.ts) before becoming ready on every restart, then rebuilds them lazily using the deployed rules. Normal sync and account-deletion [writes](server/trainer-summary-writes.ts) invalidate the affected trainers before acknowledgement; raw completed-round facts remain the source of truth. The origin explicitly requests majority write acknowledgement and runs as one writer. Do not add another writer without coordinating cache invalidation.

For exceptional raw MongoDB edits, restores, or fact migrations, stop the origin first, perform the maintenance, then restart it to clear derived values before serving reads. An ambiguous fact write or failed cache invalidation makes trainer reads and readiness unavailable until a restart.

## Sentry

Production releases send browser errors, player feedback, traces, and game metrics to Sentry.

## Data

Quizmon builds an offline catalog from [PokéAPI](https://pokeapi.co/) and [@pkmn/dex](https://github.com/pkmn/ps/tree/main/dex).

```sh
npm run data:update
```

The build fetches the trainer sprites listed in `trainer-avatars.json` from [Pokémon Showdown](https://play.pokemonshowdown.com/sprites/trainers/) and verifies their checksums before Vite copies them into `dist/`. Run `npm run avatars:prepare` for local development, or `npm run avatars:update` to refresh the tracked manifest.

## Licenses

Quizmon's original code is source-available under the [Apache License 2.0 with Commons Clause](LICENSE). Keep the [NOTICE](NOTICE) with redistributed copies. This license does not cover third-party artwork, data, trademarks, or separately licensed text. See the [Terms of Use](content/terms.md) for credits.
