import type {
  FamilyRule,
  SimilarityWeights,
} from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  RenderingControls,
} from './types.ts';
import {
  frontSprite,
  answerSprite,
  responsePresets,
  typeSimilarityWeights,
} from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Score types by their closest Pokémon to rank wrong answers. */
    similarityWeights: SimilarityWeights;
  },
  'type',
  'single'
>;

export type Rendering = RenderingControls<
  'sprite' | 'name' | 'number' | 'types',
  never,
  'sprite' | 'name' | 'number' | 'types'
>;

const controls = {
  similarityWeights: typeSimilarityWeights,
  view: { answer: { kind: 'type' } },
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: frontSprite, types: 'always' },
  related: {
    sprite: answerSprite,
    name: 'after-answer',
    number: 'after-answer',
    types: 'always',
  },
} satisfies Rendering;

export const evolutionGainedType = {
  rendering,
  pokemonSprites: ['subject', 'related'],
  levels: {
    3: {
      ...controls,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      response: responsePresets.single,
      rendering: {
        subject: { types: 'after-answer' },
        related: { types: 'after-answer' },
      },
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
