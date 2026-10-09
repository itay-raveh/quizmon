import type { FamilyRule } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  RenderingControls,
} from './types.ts';
import { responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Offer every eligible region instead of four sampled regions. */
    allOptions: boolean;
    /** Permit locations named only by a numbered land or sea route. */
    allowNumberedRoutes: boolean;
  },
  'text',
  'single'
>;

export type Rendering = RenderingControls;

const controls = {
  view: { answer: { kind: 'text' } },
  allOptions: false,
  allowNumberedRoutes: false,
} satisfies QuestionControls<Rules>;

export const locationRegion = {
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
} satisfies QuestionRuleRow<Rules, Rendering>;
