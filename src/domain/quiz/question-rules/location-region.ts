import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'text' } },
  allOptions: false,
  allowNumberedRoutes: false,
} as const satisfies QuestionControlsFor<'locationRegion'>;

const rendering = {} satisfies RenderingControlsFor<'locationRegion'>;

export const locationRegion = {
  rendering,
  levels: {
    3: {
      ...controls,
      allOptions: true,
      response: responsePresets.shortSingle,
    },
    4: {
      ...controls,
      allOptions: true,
      allowNumberedRoutes: true,
      response: responsePresets.shortSingle,
    },
  },
} satisfies QuestionRuleRow<FamilyRules['locationRegion'], 'locationRegion'>;
