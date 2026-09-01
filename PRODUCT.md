# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pokémon fans playing short quizzes on desktop or mobile. They want to test and show off their recall without creating an account or learning a complicated game.

## Product Purpose

Quizmon is a charming, complete browser game for identifying Pokémon from their sprites. It should make a quick round feel playful and satisfying, whether the player returns for the shared daily challenge or configures a custom game.

## Positioning

Quizmon combines a fast four-choice recognition loop with a configurable Pokémon pool, alternate forms, silhouette and sprite modifiers, speedrun timing, a shared daily challenge, and locally stored best scores.

## Operating Context

Players open Quizmon in a browser, choose the daily challenge or configure a custom round, answer with pointer, touch, or number keys, and receive an immediately shareable result. Settings and best scores stay in the browser. No account or hosted application backend is required.

## Capabilities and Constraints

- Covers Pokémon from Generations I through IX, including regional and special forms.
- Uses PokéAPI data and artwork through the project's existing data layer.
- Supports daily and custom games, finite or unlimited rounds, sound, silhouettes, random sprite selection, and speedrun mode.
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
- Keep daily play effortless and custom play expressive.
