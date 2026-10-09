import type {
  FamilyRule,
  TypeSearchResponse,
} from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  RenderingControls,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Restrict targets to Pokémon with exactly one type. */
    singleType: boolean;
    /** Attack multipliers eligible to be asked about. */
    multipliers: readonly number[];
    /** Search for every attack type with the requested multiplier. */
    response: TypeSearchResponse<'effectiveness'>;
  },
  'type',
  'single'
>;

export type Rendering = RenderingControls<
  'sprite' | 'name' | 'number' | 'types'
>;

const controls = {
  view: { answer: { kind: 'type' } },

  multipliers: [4, 2, 0.5, 0.25],
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: frontSprite, types: 'after-answer' },
} satisfies Rendering;

export const typeMatchup = {
  rendering,
  pokemonSprites: ['subject'],
  levels: {
    1: {
      ...controls,
      singleType: true,
      rendering: { subject: { types: 'always' } },
      multipliers: [2],
      response: responsePresets.single,
    },
    2: {
      ...controls,
      singleType: true,
      multipliers: [2],
      response: responsePresets.single,
    },
    3: {
      ...controls,
      rendering: { subject: { types: 'always' } },
      multipliers: [2, 4],
      response: responsePresets.single,
    },
    4: {
      ...controls,
      multipliers: [0.25, 0.5, 2, 4],
      response: responsePresets.single,
    },
    5: {
      ...controls,
      response: {
        kind: 'search',
        selection: 'multi',
        candidates: 'types',
        correct: 'effectiveness',
      },
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
