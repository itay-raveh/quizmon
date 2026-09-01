<p align="center">
  <img src="public/assets/images/logo.png" alt="Quizmon" width="480">
</p>

<p align="center">
  <strong>A daily Pokémon challenge for the trivia hiding in your Pokédex.</strong>
</p>

<p align="center">
  <a href="https://quizmon.raveh.dev/">Play Quizmon</a>
</p>

Quizmon is a quick browser game about more than recognizing silhouettes. Questions
cover Pokémon descriptions, types, matchups, abilities, moves, evolutions, stats,
size, and identity across Generations I through IX.

- Take the same ten-question **Trainer Trial** as everyone else each day. You get
  one attempt, saved in your browser.
- Build repeatable **Training** rounds around the generations and topics you want.
- Finish with a progressive-clue Champion question worth more when you solve it
  early.
- Share a spoiler-free result, play with touch or number keys, and keep your best
  Training scores without an account.

## Run Quizmon locally

[mise](https://mise.jdx.dev/) installs the pinned tools and exposes one setup task
for a fresh clone:

```sh
mise run setup
npm run dev
```

Open <http://localhost:5173>. To run the same checks used by CI:

```sh
mise run check
```

## Pokémon data

Quizmon builds a versioned catalog from [PokéAPI](https://pokeapi.co/) and ships it
as a hashed static asset. Live rounds do not call the PokéAPI service. They load
the catalog and classic sprite images directly, so the game needs no account or
application backend. Settings, daily results, and Training bests stay in browser
storage.

Refresh the checked-in catalog with:

```sh
npm run data:update
```

The wordmark was made with [TextStudio](https://www.textstudio.co). Quizmon is not
affiliated with Nintendo, Game Freak, or The Pokémon Company. Pokémon and related
trademarks belong to their respective owners.

## License

Quizmon is available under the [MIT License](LICENSE).
