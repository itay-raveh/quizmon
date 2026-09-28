import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { frontSprite, answerSprite, responsePresets } from './shared.ts';

const controls = {
  similarityWeights: {
    sharedType: 12,
    shape: 8,
    color: 5,
    generation: 4,
    evolutionStage: 3,
    statMaximum: 3,
    statScale: 80,
  },
  view: { answer: { kind: 'type' } },
} as const satisfies QuestionControlsFor<'evolutionGainedType'>;

const rendering = {
  subject: { sprite: frontSprite, types: 'always' },
  related: {
    sprite: answerSprite,
    name: 'after-answer',
    number: 'after-answer',
    types: 'always',
  },
} satisfies RenderingControlsFor<'evolutionGainedType'>;

export const evolutionGainedType = {
  rendering,
  unleveled: {
    ...controls,
    response: responsePresets.single,
  },
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
} satisfies QuestionRuleRow<
  FamilyRules['evolutionGainedType'],
  'evolutionGainedType'
>;
