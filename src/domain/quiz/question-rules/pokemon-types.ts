import type {
  FamilyRule,
  TypeSearchResponse,
  SimilarityWeights,
} from '../questions/family-rules.ts';
import type { QuestionControls, QuestionRuleRow, Renderable } from './types.ts';
import {
  frontSprite,
  responsePresets,
  typeSimilarityWeights,
} from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Restrict targets to Pokémon with exactly one type. */
    singleType: boolean;
    /** Search for every type of the subject. */
    response: TypeSearchResponse<'subject-types'>;
    /** Score types by their closest Pokémon to rank wrong answers. */
    similarityWeights: SimilarityWeights;
  },
  'type',
  'single'
>;

export type Rendering = {
  subject?: Renderable<'sprite' | 'name' | 'number'> & {
    types?: 'after-answer';
  };
};

const controls = {
  similarityWeights: typeSimilarityWeights,
  view: { answer: { kind: 'type' } },
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: frontSprite, types: 'after-answer' },
} satisfies Rendering;

export const pokemonTypes = {
  rendering,
  pokemonSprites: ['subject'],
  levels: {
    1: {
      ...controls,
      singleType: true,
      response: responsePresets.single,
    },
    3: {
      ...controls,
      response: {
        kind: 'search',
        selection: 'multi',
        candidates: 'types',
        correct: 'subject-types',
      },
    },
    5: null,
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
