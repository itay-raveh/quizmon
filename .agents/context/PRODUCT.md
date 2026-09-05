# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pokémon fans playing short quizzes on desktop or mobile. They want to test and show off their recall without creating an account or learning a complicated game.

## Product Purpose

Quizmon is a charming, complete browser game for testing broad Pokémon knowledge. Its signature mode is a new five-question Daily Challenge every UTC day, with repeatable Training for the topics a player wants to practice and a demanding Quizmon League finale earned through long-term play.

## Positioning

Quizmon combines one deterministic daily gauntlet with a configurable training loop. Questions cover identification across current and historical game sprites, Pokédex descriptions, types, matchups, abilities, moves, stats, and evolution changes, then finish with a search-first Champion question that offers optional clues.

## Operating Context

Players open Quizmon in a browser, take the Daily Challenge once, configure a Training round by generation and question type, or visit their Trainer Card. Earning all eight League Badges unlocks the Quizmon League from both the landing screen and Badge Case. They answer with pointer, touch, or number keys and receive an immediately shareable, spoiler-free result. Training can immediately repeat the same configuration. Settings, completed dailies, configuration-specific Training bests, League progress, and the customizable Trainer Card stay in the browser. No account or hosted application backend is required.

## Capabilities and Constraints

- Covers the default Pokémon species from Generations I through IX.
- Builds a versioned local knowledge catalog from PokéAPI through `pokenode-ts`; live rounds do not depend on API requests.
- Supports one strict daily attempt, repeatable Training, grouped and explained question formats, configurable generations, 5, 10, or 20-question rounds, sound, and optional Quick transitions.
- Unlocks one strict 15-question Quizmon League after all eight League Badges are earned. The run covers all 14 standard formats once across all generations, ends with a clue-free Champion question, and ends immediately after one wrong answer.
- Keeps the same League lineup across reloads and failed retries until the first perfect clear. Champion rematches receive a fresh lineup.
- Counts broad knowledge progress in both Daily and Training. Quick Attack and Perfect Form require ten-question League Training with every question format enabled; generation choices remain flexible.
- Restores an unfinished Training, Daily, or League round after a reload in the same browser tab without replaying an answer that was already submitted.
- Treats the local Trainer Card as a first-class profile with an optional name and partner Pokémon, four accent colors, player-selected qualified specialties, and a dedicated case of eight one-time League Badges. Earned badges determine the visible card finish; all eight confer League Challenger rank, and a perfect League clear confers Champion rank and Hall of Fame status.
- Exports either Trainer Card face as a shareable PNG without adding an account or backend identity.
- Awards 1,000 knowledge points for a standard correct answer, adds a quick-answer bonus that halves every five seconds, and adds a mastery bonus weighted by accuracy. Champion knowledge points decrease as clues are revealed. The interface shows the earned score without presenting a maximum.
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
