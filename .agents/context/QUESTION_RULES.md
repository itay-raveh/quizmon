# Question configuration API

This is the reference for changing question behavior in `src/question-rules.ts`. The TypeScript declarations linked below are the source of truth for keys and allowed values. This page explains how those declarations are applied.

## Where to change a question

| Task | API |
| --- | --- |
| Change a family's generation, distractor, answer, or presentation settings | [`controls` and `questionRules`](../../src/question-rules.ts) |
| Change which Pokémon details appear before or after an answer | [`baseQuestionRendering` and `renderings`](../../src/question-rules.ts) |
| Change which settings a family is allowed to use | [`FamilyRules`](../../src/domain/quiz/questions/family-rules.ts) and [`RenderingControlsFor`](../../src/question-rules.ts) |
| Change a question's ID, label, or eligibility | [`questionDefinitions`](../../src/domain/quiz/questions/definitions.ts) |
| Change how a rule generates a question | [family builders and `questionBuilders`](../../src/domain/quiz/questions/registry.ts) |
| Change how a rendering rule is displayed | [`QuestionArtwork`](../../src/features/quiz/QuestionArtwork.tsx), [`QuestionAnswerChoice`](../../src/features/quiz/QuestionAnswerChoice.tsx), and [`ChampionSearch`](../../src/features/quiz/ChampionSearch.tsx) |

`QuestionType` is derived from `questionDefinitions`; `champion` is an additional `QuestionData['questionType']`. There is no separate enum or ID translation table. Persisted questions are validated against the current IDs by [`savedQuestionSchema`](../../src/domain/quiz/question-lineup.ts).

## Rule shape and level selection

Each `questionRules[type]` row has `rendering`, `levels`, and optionally `unleveled`. `levels` uses numeric key syntax from [`Difficulty`](../../src/domain/quiz/difficulty.ts), currently 1 through 5. [JavaScript stores object keys as strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects), so the resolver indexes the map with a numeric `Difficulty` instead of relying on `Object.keys()` to produce numbers. At least one level is required. A family can define only the levels where its behavior changes.

[`getQuestionVariant(type, difficulty)`](../../src/domain/quiz/question-variants.ts) returns `{ level, variant }` for the highest defined level at or below the requested difficulty. It returns `undefined` when there is no such level. `level` is the level of the rule actually selected, which can differ from the requested difficulty. The selected level entry is a complete set of controls, usually made with `...controls[type]`; controls from lower levels are **not** merged into it. [`getUnleveledQuestionRule(type)`](../../src/domain/quiz/question-variants.ts) returns the separate `unleveled` entry or `undefined`. The question builder uses the leveled path when a difficulty is present and the unleveled path otherwise.

`FamilyRules[Type]` defines the resolved rules passed to a builder: its own control fields plus `response`, `rendering`, and `view`. `QuestionRuleEntry` is the stored level or unleveled entry, whose `rendering` is an optional override. `QuestionRuleRow` adds the family rendering policy and level map. The family-specific `response` and `view.answer.kind` types reject unsupported modes and answer layouts at compile time. See [`FamilyRules`](../../src/domain/quiz/questions/family-rules.ts), [`QuestionRuleEntry` and `QuestionRuleRow`](../../src/question-rules.ts), and [`ResponseStrategy`](../../src/domain/quiz/questions/response-strategies.ts) for the exact contracts.

`response` selects choice buttons (`minimumOptions`), search (`candidates: 'pool' | 'provided'`), or a type grid (`correct: 'subject-types' | 'effectiveness'`). A family can use only the strategies listed in its `FamilyRules` entry. `view` selects the presentation of the answer and subject. It does not control whether entity details are revealed; that is `rendering`. [`applyResponseStrategy`](../../src/domain/quiz/questions/response-strategies.ts) applies these resolved values to the generated question and saves its `rendering` and `view` snapshots.

[`QuestionView`](../../src/domain/quiz/question-presentation.ts) has a required `answer` and optional `subject`. `answer.kind` selects text, Pokémon, type, or item presentation. Text answers can request `detail: 'nature' | 'move'` or `layout: 'statements'`; Pokémon answers can request `revealTypes: 'after-answer'` or the counter-pick layout. `subject.identity`, `portrait`, and `types` can request a reveal after answering; `inlineItem` selects sprite or named-item treatment in the prompt. A generated question with `optionImages` uses the item answer view regardless of its family's configured answer kind. For exact combinations, use `questionViewSchema` and the family's `view` type.

### Example: read a resolved rule

From the repository root:

```ts
import { getQuestionVariant } from './src/domain/quiz/question-variants.ts';

const result = getQuestionVariant('item-identification', 5);
if (result) {
  console.log(result.level, result.variant.response.kind);
}
```

Use the same literal family ID as the builder and definitions. TypeScript narrows `result.variant` to that family's rules. A missing result means that family has no rule at or below the requested level; the builder cannot generate that family at that difficulty.

### Example: type-check a rendering change

From the repository root:

```ts
import type { RenderingControlsFor } from './src/question-rules.ts';

const policy = {
  choices: { number: 'after-answer' },
} satisfies RenderingControlsFor<'pokemon-by-generation'>;

console.log(policy);
```

The same object can be placed in that family's `renderings` entry. TypeScript rejects a role or field that the family does not support.

## Rendering policy

`baseQuestionRendering` supplies the complete default policy. `renderings[type]` supplies a family override. An entry can add a further `rendering` override. [`mergeRendering`](../../src/domain/quiz/question-rendering.ts) resolves them in this order:

1. Base policy.
2. Family policy.
3. Selected level or unleveled entry.

Each override replaces only the fields it names. The resulting [`QuestionRendering`](../../src/domain/quiz/question-rendering.ts) has four roles:

| Role      | Entity being displayed                                 |
| --------- | ------------------------------------------------------ |
| `subject` | The Pokémon or item the prompt is about                |
| `choices` | Answer options                                         |
| `related` | Other entities in the prompt, such as evolution stages |
| `search`  | Entries in a search response                           |

Each role has `sprite`, `name`, `number`, and optional `types` visibility. `always` shows a field immediately, `after-answer` reveals it after the answer, and `never` hides it. Sprite rules additionally accept `silhouette` or `{ afterClues, silhouette? }`; `afterClues` is a nonnegative integer. The latter reveals the sprite after that many clues or after the answer. `silhouette: true` displays its silhouette until revelation. [`isVisible` and `spriteState`](../../src/domain/quiz/question-rendering.ts) evaluate these values from `{ answered, cluesShown }`. Omitted `types` resolves to `always`.

[`RenderingControlsFor<Type>`](../../src/question-rules.ts) restricts which roles and fields a family may override. For some families it also restricts values, such as a silhouette where a visible sprite would disclose the answer. An empty `renderings[type]` means there is no family override; a level entry can still override the base policy. If TypeScript rejects a proposed setting, inspect the builder and UI consumer before expanding the type. A rendering field has an effect only when the generated question supplies the corresponding media or entity data.

[`resolveQuestionRendering(type, level?)`](../../src/domain/quiz/question-variants.ts) returns the resolved policy for a family and optional level. With an unavailable level, it uses the unleveled policy if present, then the base policy. [`getQuestionRendering(question)`](../../src/domain/quiz/question-variants.ts) returns the question's saved rendering snapshot when present. If absent, it resolves the current policy and applies concealment information carried on that question. UI code should use this function for an existing question so later configuration edits do not change its stored rendering.

## Saved questions and validation

Question generation stores the resolved `rendering` and `view` on `QuestionData`. The saved-question schema accepts the current question IDs, numeric variant level, and optional validated rendering and view objects. [`questionRenderingSchema`](../../src/domain/quiz/question-rendering.ts) validates the full resolved policy, not a sparse configuration override. [`getQuestionView(question)`](../../src/domain/quiz/question-presentation.ts) returns the saved view when present and otherwise resolves a view from the current rule. These fallbacks are for question data without snapshots; they do not map renamed IDs.

TypeScript checks in-repository configuration. Runtime schema validation checks question records read from storage. Neither proves that every permitted combination is fair, has artwork, or is reachable in every generated subvariant. A changed control or rendering rule needs a focused question-generation or UI check for its actual effect.
