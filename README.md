<p align="center">
  <img src="public/assets/images/logo.png" alt="Quizmon" width="480">
</p>

<p align="center">
  <strong>A tiny Pokémon quiz I started while learning React.</strong>
</p>

<p align="center">
  <a href="https://quizmon.raveh.dev/"><strong>Play Quizmon</strong></a>
</p>

Quizmon shows you a Pokémon sprite and four names. Pick fast, keep your
accuracy up, and find out how much Pokédex trivia still lives in your head.

## How to play

1. Press **Start** for a ten-question Generation I quiz.
2. Pick the name that matches each Pokémon.
3. Finish with as many correct answers as you can, in as little time as you
   can.

Quizmon combines accuracy and speed into one score. It needs no account and
stores your preferred modifiers in your browser.

## Make it harder

Open **Modifiers** before a game to build your own challenge:

- Mix Pokémon from Generations I through IX, including regional and special
  forms.
- Turn every sprite into a **Who’s that Pokémon?** silhouette or choose a
  random sprite for each question.
- Set the quiz length and enable speedrun mode when the answer reveal starts
  feeling slow.

## Why I made it

I started Quizmon in 2022 as a small React and Next.js learning project. It
grew through experiments with state, forms, API calls, animations, and the
question Pokémon fans ask: “Wait, what was that one called?”

The 2026 rebuild replaced Next.js with Vite, updated the game to modern React,
and moved it to Cloudflare Workers. It kept the original quiz, its odd little
modifiers, and the big loud logo.

## Run it on your machine

From a clone of this repository:

```sh
mise install
npm ci
mise run dev
```

Vite prints the local URL when the development server starts.

## Work on it

| Command                  | What it does                             |
| ------------------------ | ---------------------------------------- |
| `mise run hooks:install` | Installs the prek commit hooks           |
| `mise run check`         | Formats and validates the repository     |
| `mise run e2e`           | Runs the browser tests                   |
| `mise run data:update`   | Refreshes the checked-in Pokémon catalog |

Commits use the [Conventional Commits](https://www.conventionalcommits.org/)
format. CI runs the same formatting, linting, unit, browser, build, and
configuration checks you can run on your machine.

## Pokémon data

Quizmon keeps its Pokémon catalog in the repository, then asks
[PokéAPI](https://pokeapi.co/) for sprites and details during a game. The game
is a fan project and has no affiliation with Nintendo, Game Freak, or The
Pokémon Company.
