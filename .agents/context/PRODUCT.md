# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pokémon fans playing short quizzes on desktop or mobile. They want to test and show off their recall without creating an account or learning a complicated game.

## Product Purpose

Quizmon is a charming, complete browser game for testing broad Pokémon knowledge. Its signature mode is a new five-question Daily Challenge every UTC day, with repeatable Training for the topics a player wants to practice and a demanding Quizmon League finale earned through long-term play.

## Positioning

Quizmon combines one deterministic daily gauntlet with a configurable training loop. Questions cover identification across current, historical, animated, and illustrated Pokémon imagery, Pokédex descriptions, types, matchups, abilities, moves, stats, and evolution changes, then finish with a search-first Champion question that offers optional clues.

## Operating Context

Players open Quizmon in a browser, take the Daily Challenge once, configure a ten-question Training round by mode and generation, or visit their Trainer Card. League Training uses 15 core question formats, excluding abilities, moves, and stats. Custom Training lets the player choose from all 18 formats. Earning every League Badge unlocks the Quizmon League from both the landing screen and Badge Case. They answer with pointer, touch, or number keys and receive an immediately shareable, spoiler-free result. Training can immediately repeat the same configuration. Settings, completed dailies, separate League and Custom Training bests, League progress, and the customizable Trainer Card stay in the browser. No account or hosted application backend is required.

## Capabilities and Constraints

- Covers the default Pokémon species from Generations I through IX.
- Builds a versioned local knowledge catalog from PokéAPI through `pokenode-ts`; live rounds do not depend on API requests.
- Type twins always uses a dual-type target and asks for one Pokémon with exactly the same two types, regardless of their order. Every answer comes from a different evolution family than the target, including split branches. Targets without an unrelated type match are skipped. All option types and the target’s types reveal after answering. Legend hunt asks players to select every Legendary or Mythical Pokémon and reveals every option’s classification afterward. Both formats are available in League Training, Daily, and Custom.
- Generation roundup asks players to select every Pokémon introduced in a named generation, using at least two selected generations. It conceals Pokédex numbers and reveals every option’s generation after submission. Evolution link uses four name-only choices to complete an unambiguous three-stage chain. Its prompt, choices, and completed chain contain no photos or Pokédex numbers. Both formats are available in League Training, Daily, and Custom. Single-generation rounds skip Generation roundup.
- Supports one strict daily attempt, repeatable ten-question Training, a League or Custom mode switch, configurable generations, sound, and optional Quick transitions. League Training and the four standard Daily questions exclude abilities, moves, and stats. Daily still ends with a Champion question. Only Custom Training exposes the grouped and explained question-type picker, including all three advanced formats.
- Unlocks one strict 15-question Quizmon League after every League Badge is earned. The run covers its fixed set of 14 standard formats once across all generations, ends with a clue-free Champion question, and ends immediately after one wrong answer.
- Creates a fresh League lineup for every new attempt, failed retry, and Champion rematch. Reloading resumes the current attempt with its saved questions and answers.
- Counts broad knowledge progress in both Daily and Training. Quick Attack and Perfect Form require ten-question League Training with the core question formats; generation choices remain flexible.
- Restores an unfinished Training, Daily, or League round after a reload in the same browser tab without replaying an answer that was already submitted.
- Remembers shown questions across games in the local player save and includes this history in backups. New Training and League lineups prefer unseen eligible targets, then the oldest seen. Related Pokémon and repeated answer sets receive additional recency penalties. Changing generation selections preserves history, and unshown questions in abandoned games do not count as seen.
- Each question builder must supply a stable repeat identity, rotation subjects, featured Pokémon, and Pokémon distractors. The shared history engine uses this metadata without format-specific rules. Saved lineups retain it, and missing metadata is rejected during validation. Candidate sampling reduces repeats for assembled questions without guaranteeing exhaustion of every combination.
- Seeded generation uses a local `seedrandom` instance. Daily and League generation are deterministic, and unfinished games restore their saved full lineups.
- Daily uses a shared deterministic rotation of question formats and eligible targets. Personal history never changes a Daily lineup, but seeing a Daily question informs later Training and new League runs. Reloads retain the current attempt’s saved lineup; new League attempts and retries generate a fresh one.
- Treats the local Trainer Card as a first-class profile with an optional name and partner Pokémon, player-selected qualified specialties, and a dedicated case of three-tier League Badges. Tier-1 badges determine the card's rank accent and visible finish; earning every badge at tier 1 confers League Challenger rank, and a perfect League clear confers Champion rank and Hall of Fame status.
- Gives every badge Bronze, Silver, and Gold tiers. Many Paths requires 1 correct answer in each of 10 formats, then 10 in each of 15, then 50 in all 18. Pokédex Trail requires 151 and 500 different correctly answered Pokémon, then completion of the entire Personal Pokédex against the shipped catalog. World Tour requires 1, 25, and 100 correct answers in each of all 9 generations. True Calling requires 50, 250, and 1,000 correct answers in one specialty. Quick Attack requires 1, 10, and 50 qualifying League Training rounds. Perfect Form requires 3, 25, and 100 perfect League Training rounds. Daily Resolve uses best Daily Combos of 3, 7, and 30 days. Champion's Instinct requires 1, 5, and 30 clue-free Champion answers.
- Gives all eight Trainer Titles tiers at 10, 100, and 1,000 correct answers in their specialty. Titles are equippable at tier 1 and automatically display their highest earned tier. Existing saved counters count toward higher tiers; a legacy Quick Attack achievement credits one qualifying round. Totals continue after Gold, and additional tiers do not change the League gate or Trainer rank.
- Shows the Hall of Fame and its navigation only after a perfect League clear. Before that, Hall of Fame links display the League challenge.
- Exports either Trainer Card face as a shareable PNG without adding an account or backend identity.
- Awards 1,000 knowledge points for a standard correct answer, adds a quick-answer bonus that halves every five seconds, and adds a mastery bonus weighted by accuracy. Champion knowledge points decrease as clues are revealed. The interface shows the earned score without presenting a maximum.
- Must remain responsive, keyboard-operable, and usable without an account.
- Offers installation in Settings under Experience and between the Daily score and achievement progress. The Daily offer shares one space with reminders, remembers installation dismissal on the device, and never follows installation with another permission request in the same result view.
- Uses the browser's install prompt when available and a player-opened instructions dialog for iOS, Firefox on Android or supported Windows versions, and Safari on Mac. Installation controls stay hidden in the installed app and where no supported installation journey is known. Notification permission remains a separate choice.
- Apple installation instructions explain how to transfer saved progress using the existing Backup and Restore controls, because Home Screen and Dock apps do not inherit browser local storage.
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
