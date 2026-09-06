<p align="center">
  <img src="https://quizmon.raveh.dev/assets/images/logo.png" alt="Quizmon" width="480">
</p>

<p align="center">
  <a href="https://quizmon.raveh.dev/">Play Quizmon</a>
</p>

Quizmon is a browser game about Pokémon sprites, descriptions, types, matchups, abilities, moves, evolutions, stats, etc. Scores and Trainer progress stay in the browser.

## Run Quizmon locally

[mise](https://mise.jdx.dev/) installs the pinned tools and exposes one setup task for a fresh clone:

```sh
mise run setup
npm run dev
```

## Pokémon data

Quizmon builds a versioned catalog from [PokéAPI](https://pokeapi.co/) and ships it as a hashed static asset.

```sh
npm run data:update
```

## Daily reminders

The private VAPID key is stored as `VAPID_PRIVATE_KEY` in GitHub's `production` environment. CI passes it to Wrangler only during deployment, while the matching public key stays in [`src/notifications/config.ts`](src/notifications/config.ts).

## License

Quizmon is available under the [MIT License](https://github.com/itay-raveh/quizmon/blob/main/LICENSE).

Wordmark was made with [TextStudio](https://www.textstudio.co).

Card sparkle animation from [Julien Jorge](https://opengameart.org/content/sparkles).

Sound effects from [Kenney](https://kenney.nl/assets/interface-sounds).

Quizmon is not affiliated with Nintendo, Game Freak, or The Pokémon Company. Pokémon and related trademarks belong to their respective owners.
