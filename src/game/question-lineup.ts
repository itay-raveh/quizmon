import { questionLabels } from './question-labels';
import {
  generations,
  questionCategories,
  statNames,
  type QuestionData,
} from './types';
import { isChoice, isRecord, isSafeNonnegativeInteger } from './validation';

export interface QuestionLineup {
  seed: string;
  contentVersion: number;
  questions: QuestionData[];
}

const text = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 10000;
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(text);
const optional = (value: unknown, check: (value: unknown) => boolean) =>
  value === undefined || check(value);
const map = (value: unknown, check: (value: unknown) => boolean) =>
  isRecord(value) && Object.values(value).every(check);
const sprite = (value: unknown): boolean =>
  isRecord(value) &&
  isSafeNonnegativeInteger(value.dexNumber) &&
  text(value.src) &&
  strings(value.types) &&
  optional(value.silhouette, (v) => typeof v === 'boolean');
const generationClue = (value: unknown): boolean =>
  isRecord(value) &&
  value.kind === 'generation' &&
  isChoice(value.generation, generations) &&
  strings(value.types);

type VariantCheck = (value: Record<string, unknown>) => boolean;

const mediaChecks = {
  none: () => true,
  'pixel-sprite': (value) => text(value.src),
  sprite: (value) =>
    text(value.src) &&
    typeof value.silhouette === 'boolean' &&
    optional(value.revealAt, isSafeNonnegativeInteger),
  'pixel-peek': (value) =>
    text(value.src) &&
    typeof value.focusX === 'number' &&
    typeof value.focusY === 'number' &&
    Number.isFinite(value.focusX) &&
    Number.isFinite(value.focusY),
} satisfies Record<QuestionData['media']['kind'], VariantCheck>;

const multiplier = (value: Record<string, unknown>) =>
  typeof value.multiplier === 'number' &&
  Number.isFinite(value.multiplier) &&
  value.multiplier >= 0;

const visualChecks = {
  'type-check': () => true,
  'type-twins': () => true,
  'type-roundup': (value) => text(value.type),
  'generation-roundup': (value) => isChoice(value.generation, generations),
  'evolution-link': (value) =>
    text(value.before) && text(value.after) && map(value.stages, sprite),
  'evolution-shift': (value) =>
    sprite(value.evolution) &&
    isRecord(value.evolution) &&
    text(value.evolution.name) &&
    text(value.gainedType),
  'stat-showdown': (value) =>
    isChoice(value.stat, statNames) &&
    isChoice(value.direction, ['highest', 'lowest'] as const),
  'type-matchup': multiplier,
  'counter-pick': multiplier,
} satisfies Record<NonNullable<QuestionData['visual']>['kind'], VariantCheck>;

const variant = (
  value: unknown,
  checks: Record<string, VariantCheck>,
): boolean =>
  isRecord(value) &&
  typeof value.kind === 'string' &&
  Object.hasOwn(checks, value.kind) &&
  checks[value.kind]!(value);

export const isQuestionData = (value: unknown): value is QuestionData => {
  if (!isRecord(value) || !isRecord(value.answer) || !isRecord(value.prompt))
    return false;
  const { answer, prompt } = value;
  return (
    isRecord(value.repetition) &&
    text(value.repetition.identity) &&
    value.repetition.identity.length > 0 &&
    strings(value.repetition.subjects) &&
    strings(value.repetition.primary) &&
    strings(value.repetition.distractors) &&
    text(value.id) &&
    text(value.pokemonName) &&
    strings(value.pokemonTypes) &&
    typeof value.questionType === 'string' &&
    Object.hasOwn(questionLabels, value.questionType) &&
    isChoice(value.category, questionCategories) &&
    isChoice(value.generation, generations) &&
    strings(value.options) &&
    value.options.length > 0 &&
    new Set(value.options).size === value.options.length &&
    strings(answer.correctOptions) &&
    answer.correctOptions.length > 0 &&
    new Set(answer.correctOptions).size === answer.correctOptions.length &&
    answer.correctOptions.every((option) =>
      (value.options as string[]).includes(option),
    ) &&
    (answer.interaction === 'single-choice'
      ? answer.correctOptions.length === 1
      : answer.interaction === 'multi-select') &&
    (prompt.kind === 'text'
      ? text(prompt.text)
      : prompt.kind === 'pokemon' &&
        text(prompt.before) &&
        text(prompt.after) &&
        text(prompt.name) &&
        isSafeNonnegativeInteger(prompt.dexNumber)) &&
    variant(value.media, mediaChecks) &&
    optional(value.visual, (v) => variant(v, visualChecks)) &&
    optional(value.concealOptionLabels, (v) => typeof v === 'boolean') &&
    optional(
      value.clues,
      (v) =>
        Array.isArray(v) &&
        v.every((clue) => text(clue) || generationClue(clue)),
    ) &&
    optional(value.optionDexNumbers, (v) => map(v, isSafeNonnegativeInteger)) &&
    optional(value.optionStats, (v) => map(v, isSafeNonnegativeInteger)) &&
    optional(value.optionVisuals, (v) => map(v, sprite)) &&
    optional(value.optionGenerations, (v) =>
      map(v, (g) => isChoice(g, generations)),
    ) &&
    optional(value.optionClassifications, (v) =>
      map(v, (c) => isChoice(c, ['Legendary', 'Mythical', 'Neither'] as const)),
    ) &&
    optional(
      value.searchOptions,
      (v) =>
        Array.isArray(v) &&
        v.every(
          (o) =>
            isRecord(o) &&
            text(o.name) &&
            isSafeNonnegativeInteger(o.dexNumber),
        ),
    )
  );
};

export const isQuestionLineup = (value: unknown): value is QuestionLineup =>
  isRecord(value) &&
  text(value.seed) &&
  value.seed.length > 0 &&
  value.seed.length <= 200 &&
  isSafeNonnegativeInteger(value.contentVersion) &&
  Array.isArray(value.questions) &&
  value.questions.every(isQuestionData);
