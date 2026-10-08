# Question configuration API

Each question family has one rule file in [`src/domain/quiz/question-rules/`](../../src/domain/quiz/question-rules/). The file contains its generation controls, default rendering override, and numeric level entries. [`registry.ts`](../../src/domain/quiz/question-rules/registry.ts) lists every family and checks the complete map at compile time.

## Where to change behavior

| Change | Source |
| --- | --- |
| A family's generation controls, response mode, rendering, or levels | Its file in [`question-rules/`](../../src/domain/quiz/question-rules/) |
| Remove a family from automatic play while keeping it in Custom Training | Set `active: false` on its rule row |
| Shared sprite and response defaults | [`shared.ts`](../../src/domain/quiz/question-rules/shared.ts) |
| Correct-answer counts for sampled four-choice multi-select questions | [`sampledMultiCorrectCounts`](../../src/domain/quiz/question-rules/shared.ts) |
| Allowed rule and rendering fields | [`FamilyRules`](../../src/domain/quiz/questions/family-rules.ts) and [`RenderingControlsFor`](../../src/domain/quiz/question-rules/types.ts) |
| Question ID, label, or eligibility | [`questionDefinitions`](../../src/domain/quiz/questions/definitions.ts) |
| Question content and distractor generation | [Family builders](../../src/domain/quiz/questions/registry.ts) |
| Shared entity and answer rendering | [`QuestionEntity`](../../src/features/quiz/QuestionEntity.tsx), [`QuestionAnswerChoice`](../../src/features/quiz/QuestionAnswerChoice.tsx), and [`ChampionSearch`](../../src/features/quiz/ChampionSearch.tsx) |

`QuestionType` comes from `questionDefinitions`. `champion` is the additional League finale ID. [`savedQuestionSchema`](../../src/domain/quiz/lineup.ts) rejects question objects with unknown IDs.

## Rules and levels

A family file exports a row with `rendering` and `levels`. Its local `controls` object supplies defaults copied into each entry. Every level entry is complete: it does not inherit controls from lower levels. The numeric level keys use [`Level`](../../src/domain/quiz/level.ts), currently 1 through 5.

Families are active by default. `active: false` removes a family from automatic Training, Daily, and League generation but keeps its level rules, Custom Training choice, and normal scoring. The Custom picker places these families under Custom only. Level `null` entries still control which levels can use a family, including in Custom Training.

[`getQuestionVariant(type, level)`](../../src/domain/quiz/variants.ts) selects the highest defined level at or below the requested level and returns its actual level with the resolved rule. A `null` level entry ends availability until another rule appears. It returns `undefined` if no level qualifies.

[`FamilyRules`](../../src/domain/quiz/questions/family-rules.ts) defines each builder's control fields and allowed answer presentation. [`QuestionRuleRow`](../../src/domain/quiz/question-rules/types.ts) checks a family file's levels and rendering; the registry checks that every family has a file. The [`ResponseStrategy`](../../src/domain/quiz/questions/response-strategies.ts) specifies:

- `picker`: `selection` is `single`, `multi`, or `adaptive`. `adaptive` keeps the mode selected by a family-specific prompt or finale. `minimumOptions: 4` requires exactly four choices; `2` permits two or more.
- Single-answer `search`: `candidates` is the eligible Pokémon pool or entries supplied by the builder. Search always displays names.
- Multi-answer `search`: `candidates: 'types'` presents types; `correct` selects the subject's types or the types matching an effectiveness multiplier.

The response and `view.answer.kind` types reject modes and answer layouts a family cannot use. [`assembleQuestion`](../../src/domain/quiz/questions/rendering-pipeline.ts) applies the resolved rendering and response to generated content, then attaches the rendering and view snapshots to the question.

The sampled four-choice multi-select families use `sampledMultiCorrectCounts` from `shared.ts` and weight one through four correct answers at 15%, 35%, 35%, and 15% respectively when all counts are feasible. They renormalize these weights over counts supported by the eligible correct and wrong Pokémon pools. History selection preserves the first viable draft’s answer count. Complete-list questions, such as Pokémon types and berry flavors, present every factually correct answer instead of sampling a target count.

For example, the Level 5 Pixel peek rule is in [`pokemon-from-pixel-crop.ts`](../../src/domain/quiz/question-rules/pokemon-from-pixel-crop.ts). To inspect its resolved value:

```ts
import { getQuestionVariant } from './src/domain/quiz/variants.ts';

const result = getQuestionVariant('pokemonFromPixelCrop', 5);
if (result) console.log(result.level, result.variant.response);
```

## Rendering

[`baseQuestionRendering`](../../src/domain/quiz/question-rules/shared.ts) provides a complete default. A family's local `rendering` value overrides it. A level can provide a further `rendering` override. [`mergeRendering`](../../src/domain/quiz/rendering.ts) replaces only the fields specified by each override.

`subject`, `choices`, `related`, and `search` are the four rendering roles. Each has `sprite`, `name`, `number`, and `types`. Field visibility is `always`, `after-answer`, or `never`. A sprite is `null` or an object with `reveal`, `silhouette`, and optional Pokémon `source` (`front` or `all`). `reveal` is `always`, `after-answer`, or `{ afterClues: number }`. Search names are required by the TypeScript type and saved-question schema.

[`RenderingControlsFor<Type>`](../../src/domain/quiz/question-rules/types.ts) permits only fields that the family's current renderer consumes and restricts values that would disclose an answer. To change a family rule, update its file. If TypeScript rejects a rendering setting, inspect the generated media and UI path before extending the allowed type.

[`getQuestionRendering(question)`](../../src/domain/quiz/variants.ts) uses the question's rendering snapshot when present. Otherwise it resolves the current rule for `variantLevel`, or the family rendering when the level is absent.

## Question data and validation

Generated questions carry their resolved `rendering`, `view`, and `variantLevel`. [`questionRenderingSchema`](../../src/domain/quiz/rendering.ts) validates complete rendering snapshots; [`savedQuestionSchema`](../../src/domain/quiz/lineup.ts) validates question objects. Completed rounds persist compact answer observations rather than full question lineups, and unfinished rounds do not resume. TypeScript checks authored rules, while runtime validation handles data read from storage. A new visibility combination still needs a generation or UI check to establish that its clues and answers remain usable.

Completed rounds keep unknown family IDs in their original answer positions. They earn zero points and no question-specific progress when rescored, while invalid answer facts still fail validation. Saved Custom selections discard unknown IDs when loaded.
