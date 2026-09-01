# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pokémon fans playing short quizzes on desktop or mobile. They want to test and show off their recall without creating an account or learning a complicated game.

## Product Purpose

Quizmon is a charming, complete browser game for testing broad Pokémon knowledge. Its signature mode is a new ten-question Trainer Trial every UTC day, with repeatable Training for the topics a player wants to practice.

## Positioning

Quizmon combines one deterministic daily gauntlet with a configurable training loop. Questions cover identification, Pokédex descriptions, types, matchups, abilities, moves, stats, size, and evolutions, then finish with a progressive-clue Champion question.

## Operating Context

Players open Quizmon in a browser, take the daily Trainer Trial once, or configure a Training round by generation and question type. They answer with pointer, touch, or number keys and receive an immediately shareable, spoiler-free result. Settings, completed dailies, and best Training scores stay in the browser. No account or hosted application backend is required.

## Capabilities and Constraints

- Covers the default Pokémon species from Generations I through IX.
- Builds a versioned local knowledge catalog from PokéAPI through `pokenode-ts`; live rounds do not depend on API requests.
- Supports one strict daily attempt, repeatable Training, configurable question categories and generations, sound, finite or full-pool rounds, and speedrun transitions.
- Scores each round out of 100 points per question. Time is displayed and breaks equal Training scores, but does not multiply points.
- Must remain responsive, keyboard-operable, and usable without an account.
- Must preserve the existing game mechanics and static-web deployment model during visual work.
- Must not imply affiliation with Nintendo, Game Freak, or The Pokémon Company.

## Brand Commitments

- The product name is Quizmon.
- The existing wordmark deliberately echoes the Pokémon logo and must remain.
- The existing pixel-art landscape is a Pokémon game scene and must remain as the environmental setting.
- Quizmon should feel like a real, charming, whimsical game, not a learning-project showcase or a generic web application.
- Interface chrome must belong with the wordmark and pixel-art setting. Generic clean cards and SaaS-style controls are not part of the intended identity.
- Any TextStudio credit must describe the wordmark as made or created with the tool, never as generated.

## Evidence on Hand

- Responsive wordmark assets: `src/assets/images/logo-496.avif`, `src/assets/images/logo-496.webp`, `src/assets/images/logo-992.avif`, and `src/assets/images/logo-992.webp`.
- Pixel-art landscape assets: `src/assets/images/bg.avif` and `src/assets/images/bg.webp`.
- Pokémon artwork and metadata supplied through the existing PokéAPI integration and checked-in catalog.
- Existing sound effects in `src/assets/sounds/`.
- No testimonials, commercial claims, or affiliation claims are available and none should be invented.

## Product Principles

- Make the quiz itself the star from the first interaction.
- Keep each round immediate, readable, and satisfying across input methods.
- Let playful character extend through every state without obscuring choices, progress, or results.
- Preserve the recognizable Quizmon identity while giving the interface the same level of commitment as the logo and setting.
- Keep daily play effortless and Training expressive.
