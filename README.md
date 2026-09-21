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

Optional accounts sync completed progress and add friends and Daily leaderboards. Local development requires Docker. The [Helm chart](charts/quizmon/) packages the online services; `deploy/` contains their release tooling.

## Data

Quizmon builds an offline dataset of Pokémon species and selected forms from [PokéAPI](https://pokeapi.co/). Ability effect choices use short descriptions from [Pokémon Showdown](https://github.com/smogon/pokemon-showdown), with generation-specific mechanics and fuller explanations available after answering. The importer pins its source revision in `scripts/ability-text.ts`. Live games do not request either source.

```sh
npm run data:update
```

The build fetches uncredited 80 × 80 trainer sprites from [Pokémon Showdown's trainer sprite index](https://play.pokemonshowdown.com/sprites/trainers/) and generates the avatar catalog. Sprite PNGs are ignored in Git and copied into `dist/` by Vite. Run `npm run avatars:update` to refresh the catalog for local development.

## Licenses

Quizmon is available under the [MIT License](LICENSE).

Pokémon Showdown ability text is distributed under its [MIT license](public/licenses/pokemon-showdown.txt).

Trainer sprites are Pokémon artwork, not MIT-licensed code. Pokémon Showdown's [sprite repository](https://github.com/smogon/sprites#license) identifies Nintendo, GAME FREAK, and The Pokémon Company as the owners of the original artwork.

Wordmark was made with [TextStudio](https://www.textstudio.co).

Card animation from [Sparkles](https://opengameart.org/content/sparkles).

Sound effects from [Kenney](https://kenney.nl/assets/interface-sounds).

Quizmon is an unofficial, fan-made Pokémon quiz. It is not affiliated with, sponsored by, or endorsed by Nintendo, Creatures Inc., GAME FREAK, or The Pokémon Company. Pokémon and related names, characters, images, and trademarks belong to their respective owners.
