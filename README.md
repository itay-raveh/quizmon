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

After a player finishes their first Daily, Quizmon offers an optional reminder for 8:00 AM in their time zone. The browser permission request only appears after the player chooses **Remind me**.

Each enabled browser stores an anonymous push subscription, its time zone, and the last completed Daily in a Cloudflare Durable Object. Quizmon does not require an account, name, or email address. Players can turn reminders off in **Settings → Experience** or in their browser settings.

Production deployment requires the `VAPID_PRIVATE_KEY` GitHub Actions secret that matches the public key in [`src/notifications/config.ts`](src/notifications/config.ts). To rotate the pair, generate new VAPID keys, update both values, and redeploy.

## License

Quizmon is available under the [MIT License](https://github.com/itay-raveh/quizmon/blob/main/LICENSE).

The wordmark was made with [TextStudio](https://www.textstudio.co).

The Trainer Card sparkle animation by [Julien Jorge](https://opengameart.org/content/sparkles).

Button, selection, answer, and completion sounds come from Kenney's [Interface Sounds](https://kenney.nl/assets/interface-sounds) pack, released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). See the [sound source manifest](src/assets/sounds/SOURCES.md) for the file mapping.

Quizmon is not affiliated with Nintendo, Game Freak, or The Pokémon Company. Pokémon and related trademarks belong to their respective owners.
