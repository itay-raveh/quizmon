import type {
  FamilyRule,
  PokemonDistractors,
} from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  Renderable,
  PokemonChoices,
  PokemonSearch,
} from './types.ts';
import { responsePresets } from './shared.ts';

export const championClueFactors = [1, 0.75, 0.5, 0.25] as const;

export type Rules = FamilyRule<
  PokemonDistractors & {
    /** Optional finale response and assistance rules; null uses ordinary choices. */
    finale: null | {
      /** Initially reveal choices, choices with types, or search. */
      opening: 'choices-types' | 'choices' | 'search';
      /** Allow player-requested clues. */
      assistance: boolean;
      /** Initial clue count used as the score penalty. */
      penalty: number;
    };
  },
  'pokemon',
  'single' | 'adaptive'
>;

export type Rendering = {
  subject?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
  choices?: PokemonChoices;
  search?: PokemonSearch;
};

const controls = {
  view: { answer: { kind: 'pokemon' } },
  finale: null,
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: {
    sprite: {
      silhouette: true,
      reveal: { afterClues: 4 },
    },
    name: 'after-answer',
    number: 'after-answer',
  },
  choices: {
    sprite: null,
    name: 'always',
    number: 'after-answer',
    types: 'after-answer',
  },
  search: { sprite: null, number: 'never' },
} satisfies Rendering;

export const champion = {
  rendering,
  pokemonSprites: ['subject', 'choices', 'search'],
  levels: {
    1: {
      ...controls,
      rendering: { choices: { types: 'always' } },
      finale: {
        opening: 'choices-types',
        assistance: false,
        penalty: 2,
      },
      response: responsePresets.single,
    },
    2: {
      ...controls,
      finale: {
        opening: 'choices',
        assistance: false,
        penalty: 1,
      },
      response: responsePresets.single,
    },
    3: {
      ...controls,
      finale: {
        opening: 'search',
        assistance: true,
        penalty: 0,
      },
      response: responsePresets.adaptive,
    },
    5: {
      ...controls,
      finale: {
        opening: 'search',
        assistance: false,
        penalty: 0,
      },
      response: responsePresets.adaptive,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
