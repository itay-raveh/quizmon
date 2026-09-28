# Question configuration API

Each question family has one rule file in [`src/domain/quiz/question-rules/`](../../src/domain/quiz/question-rules/). The file contains its generation controls, default rendering override, and numeric level entries. [`registry.ts`](../../src/domain/quiz/question-rules/registry.ts) lists every family and checks the complete map at compile time.

## Where to change behavior

| Change | Source |
| --- | --- |
| A family's generation controls, response mode, rendering, or levels | Its file in [`question-rules/`](../../src/domain/quiz/question-rules/) |
| Shared sprite and response defaults | [`shared.ts`](../../src/domain/quiz/question-rules/shared.ts) |
| Allowed rule and rendering fields | [`FamilyRules`](../../src/domain/quiz/questions/family-rules.ts) and [`RenderingControlsFor`](../../src/domain/quiz/question-rules/types.ts) |
| Question ID, label, or eligibility | [`questionDefinitions`](../../src/domain/quiz/questions/definitions.ts) |
| Question content and distractor generation | [Family builders](../../src/domain/quiz/questions/registry.ts) |
| Shared entity and answer rendering | [`QuestionEntity`](../../src/features/quiz/QuestionEntity.tsx), [`QuestionAnswerChoice`](../../src/features/quiz/QuestionAnswerChoice.tsx), and [`ChampionSearch`](../../src/features/quiz/ChampionSearch.tsx) |

`QuestionType` comes from `questionDefinitions`. `champion` is the additional League finale ID. [`savedQuestionSchema`](../../src/domain/quiz/question-lineup.ts) rejects saved questions with unknown IDs.

## Rules and levels

A family file exports a row with `rendering`, `levels`, and optionally `unleveled`. Its local `controls` supplies defaults copied into each entry. Every level entry is complete: it does not inherit controls from lower levels. The numeric level keys use [`Difficulty`](../../src/domain/quiz/difficulty.ts), currently 1 through 5.

[`getQuestionVariant(type, difficulty)`](../../src/domain/quiz/question-variants.ts) selects the highest defined level at or below the requested difficulty and returns its actual level with the resolved rule. It returns `undefined` if no level qualifies. [`getUnleveledQuestionRule(type)`](../../src/domain/quiz/question-variants.ts) reads the separate `unleveled` entry.

[`FamilyRules`](../../src/domain/quiz/questions/family-rules.ts) defines each builder's control fields and allowed answer presentation. [`QuestionRuleRow`](../../src/domain/quiz/question-rules/types.ts) checks a family file's levels and rendering; the registry checks that every family has a file. The [`ResponseStrategy`](../../src/domain/quiz/questions/response-strategies.ts) specifies:

- `choices`: `selection` is `single`, `multi`, or `adaptive`. `adaptive` keeps the mode selected by a family-specific prompt or finale. `minimumOptions: 4` requires exactly four choices; `2` permits two or more.
- `search`: `candidates` is the eligible Pokémon pool or entries supplied by the builder. Search always displays names.
- `type-grid`: `correct` selects the subject's types or the types matching an effectiveness multiplier.

The response and `view.answer.kind` types reject modes and answer layouts a family cannot use. [`assembleQuestion`](../../src/domain/quiz/questions/rendering-pipeline.ts) applies the resolved rendering and response to generated content, then saves the rendering and view snapshots on the question.

For example, the Level 5 item rule is in [`item-identification.ts`](../../src/domain/quiz/question-rules/item-identification.ts). To inspect its resolved value:

```ts
import { getQuestionVariant } from './src/domain/quiz/question-variants.ts';

const result = getQuestionVariant('itemIdentification', 5);
if (result) console.log(result.level, result.variant.response);
```

## Rendering

[`baseQuestionRendering`](../../src/domain/quiz/question-rules/shared.ts) provides a complete default. A family's local `rendering` value overrides it. A level can provide a further `rendering` override. [`mergeRendering`](../../src/domain/quiz/question-rendering.ts) replaces only the fields specified by each override.

`subject`, `choices`, `related`, and `search` are the four rendering roles. Each has `sprite`, `name`, `number`, and `types`. Field visibility is `always`, `after-answer`, or `never`. A sprite is `null` or an object with `reveal`, `silhouette`, and optional Pokémon `source` (`front` or `all`). `reveal` is `always`, `after-answer`, or `{ afterClues: number }`. Search names are required by the TypeScript type and saved-question schema.

[`RenderingControlsFor<Type>`](../../src/domain/quiz/question-rules/types.ts) permits only fields that the family's current renderer consumes and restricts values that would disclose an answer. To change a family rule, update its file. If TypeScript rejects a rendering setting, inspect the generated media and UI path before extending the allowed type.

[`resolveQuestionRendering(type, level?)`](../../src/domain/quiz/question-variants.ts) resolves current rules. [`getQuestionRendering(question)`](../../src/domain/quiz/question-variants.ts) prefers a saved question's rendering snapshot, so later rule edits do not alter that question's appearance.

## Saved data

Generated questions store their resolved `rendering`, `view`, and selected level. [`questionRenderingSchema`](../../src/domain/quiz/question-rendering.ts) validates complete saved rendering snapshots; [`savedQuestionSchema`](../../src/domain/quiz/question-lineup.ts) validates the whole saved question. TypeScript checks authored rules, while runtime validation handles records read from storage. A new visibility combination still needs a generation or UI check to establish that its clues and answers remain usable.
