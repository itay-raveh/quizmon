import type { QuestionRendering } from '../question-rendering.ts';

export const frontSprite = {
  reveal: 'always',
  silhouette: false,
  source: 'front',
} as const;
export const itemSprite = { reveal: 'always', silhouette: false } as const;
export const silhouetteSprite = { ...frontSprite, silhouette: true } as const;
export const answerSprite = { ...frontSprite, reveal: 'after-answer' } as const;

/** Visibility defaults applied before family and level rendering overrides. */
export const baseQuestionRendering: QuestionRendering = {
  subject: {
    sprite: null,
    name: 'always',
    number: 'always',
    types: 'never',
  },
  choices: {
    sprite: frontSprite,
    name: 'always',
    number: 'always',
    types: 'never',
  },
  related: {
    sprite: null,
    name: 'always',
    number: 'always',
    types: 'never',
  },
  search: {
    sprite: frontSprite,
    name: 'always',
    number: 'always',
    types: 'never',
  },
};

export const responsePresets = {
  single: { kind: 'choices', selection: 'single', minimumOptions: 4 },
  shortSingle: { kind: 'choices', selection: 'single', minimumOptions: 2 },
  multi: { kind: 'choices', selection: 'multi', minimumOptions: 4 },
  shortMulti: { kind: 'choices', selection: 'multi', minimumOptions: 2 },
  adaptive: { kind: 'choices', selection: 'adaptive', minimumOptions: 4 },
} as const;
