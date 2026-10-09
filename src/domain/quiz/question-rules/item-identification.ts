import type { FamilyRule, SearchResponse } from '../questions/family-rules.ts';
import type {
  ItemSprite,
  QuestionControls,
  QuestionRuleRow,
  VisibleItem,
  ItemChoices,
} from './types.ts';
import { itemSprite, responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Permit the selected bag and paper items as answers and choices. */
    allowEverydayItems: boolean;
    /** Require wrong items from different categories. */
    distinctItemCategories: boolean;
    /** Restrict wrong items to the target's bag pocket. */
    sameItemPocket: boolean;
    /** Restrict wrong items to the target's pocket and category. */
    sameItemCategory: boolean;
    /** Search uses item names supplied by the builder. */
    response: SearchResponse<'provided'>;
  },
  'item',
  'single'
>;

export type Rendering = {
  subject?: VisibleItem;
  choices?: ItemChoices;
  search?: { sprite?: ItemSprite | null };
};

const controls = {
  view: { answer: { kind: 'item' } },
  allowEverydayItems: false,
  distinctItemCategories: false,
  sameItemPocket: false,
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { name: 'never', sprite: itemSprite },
  choices: { name: 'always', sprite: null },
  search: { sprite: null },
} satisfies Rendering;

export const itemIdentification = {
  rendering,
  levels: {
    2: {
      ...controls,
      sameItemPocket: true,
      response: responsePresets.single,
    },
    3: {
      ...controls,
      allowEverydayItems: true,
      sameItemCategory: true,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      allowEverydayItems: true,
      response: { kind: 'search', selection: 'single', candidates: 'provided' },
    },
    5: null,
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
