import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { itemSprite, responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'item' } },
  distinctItemCategories: false,
  sameItemPocket: false,
  sameItemCategory: false,
} as const satisfies QuestionControlsFor<'itemIdentification'>;

const rendering = {
  subject: { name: 'never', sprite: itemSprite },
  choices: { name: 'always', sprite: null },
  search: { sprite: null },
} satisfies RenderingControlsFor<'itemIdentification'>;

export const itemIdentification = {
  rendering,
  lastLevel: 4,
  levels: {
    2: {
      ...controls,
      sameItemPocket: true,
      response: responsePresets.single,
    },
    3: {
      ...controls,
      sameItemCategory: true,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      response: { kind: 'search', selection: 'single', candidates: 'provided' },
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['itemIdentification'],
  'itemIdentification'
>;
