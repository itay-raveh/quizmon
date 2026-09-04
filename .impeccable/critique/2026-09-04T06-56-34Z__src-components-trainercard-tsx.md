---
target: Trainer Card stamp system
total_score: 25
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
timestamp: 2026-09-04T06-56-34Z
slug: src-components-trainercard-tsx
---

Method: dual-agent (A: Cicero · B: Meitner)

# Quizmon Trainer Card stamp critique

## Design health

| #         | Heuristic                           |     Score | Key issue                                                                                                                               |
| --------- | ----------------------------------- | --------: | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of system status         |         2 | Progress exists, but new unlocks are reported only as a generic Trainer Card update.                                                    |
| 2         | Match between system and real world |         2 | Codes such as D7, C7, P3, and K3 read like database abbreviations rather than earned Pokémon League marks.                              |
| 3         | User control and freedom            |         3 | Players can inspect the stamp case, but cannot choose goals or understand which play mode is the best route to them.                    |
| 4         | Consistency and standards           |         2 | Daily Regular and Combo Keeper reward nearly the same behavior, while rank and card finish repeat the same progression counters.        |
| 5         | Error prevention                    |         2 | A broken streak can still display 6/7 progress, and Quick 5 can farm Perfect Form as efficiently as longer rounds.                      |
| 6         | Recognition rather than recall      |         2 | Compact stamps rely on opaque codes, tiny labels, and hover or focus detail to communicate meaning.                                     |
| 7         | Flexibility and efficiency          |         3 | Existing counters make the system inexpensive to compute, but they cannot express question-format, generation, clue, or mastery goals.  |
| 8         | Aesthetic and minimalist design     |         3 | The card itself is distinctive, but five visually identical circles flatten the collection and crowd the mobile back face.              |
| 9         | Error recognition and recovery      |         3 | Progress bars expose distance to a goal, but misleading streak progress and coarse Well Rounded progress do not explain how to recover. |
| 10        | Help and documentation              |         3 | The full stamp case explains requirements, while the shareable card and compact face do not communicate them independently.             |
| **Total** |                                     | **25/40** | **Strong card frame, weak achievement architecture.**                                                                                   |

## Design specificity verdict

The Trainer Card is authored and specific. The stamps are not. They are generic counters rendered inside matching circles, with terse alphanumeric labels that feel closer to internal achievement IDs than Pokémon League stamps. The deterministic detector found no syntax-level UI violations, which reinforces that the main defect is semantic and motivational rather than a mechanical CSS error. A live browser overlay was unavailable for this pass.

## Overall impression

The user's diagnosis is correct. The stamps feel arbitrary because their requirements come from whatever counters already existed. They overlap because Daily Regular and Combo Keeper can unlock together on the seventh consecutive Daily. They feel easy because First Catch is automatic, Well Rounded measures participation rather than correct knowledge, and Perfect Form can be earned through short five-question runs.

Current achievement guidance recommends distinct goals spread across the lifetime of a game, incremental progression, and rewards for diverse play. The Pokémon Trainer Card precedent is stronger still: major accomplishments, completed in different orders, visibly transform the card. Quizmon should use that model rather than adding more counters.

## What is working

1. The stamp case already provides a place for requirements and progress, so the compact card does not need to carry every explanation.
2. The card reveal and selectable accent give progression a desirable physical object to modify.
3. Local statistics already provide a foundation for durable, private progression without a backend.

## Priority issues

### [P1] Two stamps reward the same Daily sequence

**Why it matters:** Clearing seven consecutive Dailies can unlock D7 and C7 together. One behavior fills 40 percent of the collection, and the two rewards compete for the same meaning.

**Fix:** Keep one Daily axis. Make it an evolving consistency stamp rather than separate cumulative and streak stamps.

**Suggested command:** `$impeccable distill`

### [P1] The mastery stamps do not require mastery

**Why it matters:** First Catch is automatic after one game. Well Rounded counts answers, including incorrect ones. Perfect Form gives a short Quick 5 the same credit as a longer round. These goals reward participation and farming more than Pokémon knowledge.

**Fix:** Move the welcome milestone outside the five scarce stamp slots. Require correct answers for breadth, and define perfect mastery against a meaningful minimum round length.

**Suggested command:** `$impeccable clarify`

### [P2] The collection has no sustained progression curve

**Why it matters:** Several stamps arrive immediately or in the first week, then the card has little to pursue while Champion rank still asks for much larger totals.

**Fix:** Use five evolving League stamps with two or three visible tiers each. Make the first tier attainable without being automatic, then let later tiers span weeks. Derive rank and finish from those stamp tiers so the same behavior is not rewarded twice by parallel systems.

**Suggested command:** `$impeccable shape`

### [P2] Every stamp has the same silhouette and opaque shorthand

**Why it matters:** Identical circles make the row scan as counters rather than collectibles. D7, C7, P3, and K3 require explanation and are especially weak in shared images.

**Fix:** Give each progression axis one crisp pixel or stamp-cut motif. Show motifs only on the compact card. Put the name, requirement, progress, and next tier in the stamp case.

**Suggested command:** `$impeccable delight`

### [P2] Unlocks have no specific payoff

**Why it matters:** A generic Trainer Card updated message does not tell the player which stamp evolved or what they did to earn it.

**Fix:** Show one restrained result-screen reveal with the stamp name, new tier, motif, and next goal. Store the earned tier and date so unlock order remains stable.

**Suggested command:** `$impeccable delight`

## Recommended replacement

Replace the five one-off counters with five evolving League stamps:

1. **Mastery:** perfect Standard or longer Training rounds. Quick 5 does not qualify.
2. **Breadth:** correct answers across the available question formats, not merely participation.
3. **World Tour:** correct answers spanning all selected Pokémon generations.
4. **Champion's Instinct:** solve final-search or other high-agency questions without using a clue.
5. **Daily:** one consistency line, with evolving milestones instead of separate Daily and combo stamps.

This needs a small progression data upgrade. Answer history must retain question type, target generation, clue use, and the relevant run length. Rank and card finish should then be derived from earned stamp tiers. The first meaningful tiers can satisfy current platform guidance for early achievement feedback, while later tiers preserve a long-term arc.

## Persona red flags

**Alex, repeat player:** Alex can farm Quick 5, gets two stamps from one seven-day sequence, then hits a long gap before Champion.

**Jordan, first-time player:** Jordan receives First Catch for an action that does not involve catching and cannot decode the compact codes without opening details.

**Sam, accessibility-dependent player:** Full requirements are available in the stamp case, but mobile labels are tiny, selected accent is not used consistently, and card finish can be communicated mainly through appearance.

## Minor observations

- A broken streak can leave a misleading near-complete best-streak bar even though the current sequence has restarted.
- Well Rounded converts three separate ten-answer thresholds into a coarse 0/3 display, hiding partial progress.
- The Stamp case uses fixed blue for earned states instead of the selected card accent.
- Specialty and Well Rounded disagree about whether category activity or correct answers define expertise.
- Existing tests cover threshold happy paths, but not overlapping unlocks, farmable short rounds, broken streaks, unlock order, or compact mobile legibility.

## Questions to consider

1. Should the five visible marks represent distinct kinds of Pokémon knowledge rather than general participation?
2. Should each mark evolve through tiers so the same five motifs become a long-term collection?
3. Should rank and finish be derived from the marks, eliminating the current duplicate progression system?
