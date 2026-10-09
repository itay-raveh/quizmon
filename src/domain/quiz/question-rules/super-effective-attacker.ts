import type {
  FamilyRule,
  PokemonDistractors,
} from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  Renderable,
  PokemonChoices,
} from './types.ts';
import {
  frontSprite,
  answerSprite,
  responsePresets,
  typeSimilarityWeights,
} from './shared.ts';

export type Rules = FamilyRule<
  PokemonDistractors & {
    /** Restrict targets to Pokémon with exactly one type. */
    singleType: boolean;
    /** Attack multipliers eligible to be asked about. */
    multipliers: readonly number[];
  },
  'pokemon',
  'single'
>;

export type Rendering = {
  subject?: Renderable<'sprite' | 'name' | 'number'> & {
    types?: 'always' | 'after-answer';
  };
  choices?: PokemonChoices;
  related?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
};

const controls = {
  view: {
    answer: {
      kind: 'pokemon',
      layout: 'superEffectiveAttacker',
    },
  },

  similarityWeights: typeSimilarityWeights,

  multipliers: [4, 2, 0.5, 0.25],
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: frontSprite, types: 'after-answer' },
  related: { sprite: answerSprite, name: 'never', number: 'never' },
  choices: { name: 'always', types: 'after-answer' },
} satisfies Rendering;

export const superEffectiveAttacker = {
  rendering,
  pokemonSprites: ['subject', 'choices', 'related'],
  levels: {
    2: {
      ...controls,
      singleType: true,
      rendering: {
        subject: { types: 'always' },
        choices: { types: 'always' },
      },
      multipliers: [2],
      response: responsePresets.single,
    },
    3: {
      ...controls,
      multipliers: [2, 4],
      response: responsePresets.single,
      rendering: { choices: { types: 'always' } },
    },
    4: {
      ...controls,
      multipliers: [0.25, 0.5, 2, 4],
      response: responsePresets.single,
    },
    5: {
      ...controls,
      distractorPoolSize: 3,
      multipliers: [0.25, 0.5, 2, 4],
      smallPoolPolicy: 'fixed-size',
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
