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
  machineDiscChance: 0,
} as const satisfies QuestionControlsFor<'itemIdentification'>;

const rendering = {
  subject: { name: 'never', sprite: itemSprite },
  choices: { name: 'always', sprite: null },
  search: { sprite: null },
} satisfies RenderingControlsFor<'itemIdentification'>;

export const itemIdentification = {
  rendering,
  levels: {
    1: {
      ...controls,
      distinctItemCategories: true,
      response: responsePresets.single,
    },
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
      response: { kind: 'search', candidates: 'provided' },
    },
    5: {
      ...controls,
      machineDiscChance: 0.5,
      response: { kind: 'search', candidates: 'provided' },
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['itemIdentification'],
  'itemIdentification'
>;
