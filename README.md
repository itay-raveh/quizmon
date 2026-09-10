<p align="center">
  <img src="https://quizmon.raveh.dev/assets/images/logo.png" alt="Quizmon" width="480">
</p>

<p align="center">
  <a href="https://quizmon.raveh.dev/">Play Quizmon</a>
</p>

Quizmon is a browser game about Pokémon sprites, descriptions, types, matchups, abilities, moves, evolutions, stats, etc.

[How to play](content/about.md) explains the Daily Challenge, Training, scoring, badges,and Quizmon League.

## Run Quizmon locally

Setup using [mise](https://mise.jdx.dev/):

```sh
mise run setup
npm run dev
```

## Data

Quizmon builds an offline dataset of Pokémon species and selected forms from [PokéAPI](https://pokeapi.co/). Regional and mechanical forms count separately as partner choices and discoveries. Catalog generation groups cosmetic, costume, rare, authenticity, Totem, and Resolute variants into their retained entries and excludes unused forms. The data update generates both the gameplay catalog and its English display labels; live games do not request PokéAPI data.

```sh
npm run data:update
```

## Licenses

Quizmon is available under the [MIT License](LICENSE).

Wordmark was made with [TextStudio](https://www.textstudio.co).

Card animation from [Sparkles](https://opengameart.org/content/sparkles).

Sound effects from [Kenney](https://kenney.nl/assets/interface-sounds).

Quizmon is not affiliated with Nintendo, Game Freak, or The Pokémon Company. Pokémon and related trademarks belong to their respective owners.
