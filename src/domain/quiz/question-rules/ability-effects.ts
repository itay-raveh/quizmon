import type {
  FamilyRule,
  EffectDistractors,
  SearchResponse,
} from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  RenderingControls,
} from './types.ts';
import { responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  EffectDistractors & {
    /** Permit targets without a sprite. */
    allowMissingSprites: boolean;
    /** Search uses ability names supplied by the builder. */
    response: SearchResponse<'provided'>;
  },
  'text',
  'single'
>;

export type Rendering = RenderingControls<'sprite'>;

const controls = {
  view: { answer: { kind: 'text' }, subject: { inlineItem: 'sprite' } },
} satisfies QuestionControls<Rules>;

export const abilityEffects = {
  levels: {
    4: {
      ...controls,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      allowMissingSprites: true,
      response: {
        kind: 'search',
        selection: 'single',
        candidates: 'provided',
      },
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
