import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'text' } },
  plausibleProperties: false,
} as const satisfies QuestionControlsFor<'pokemonAbilities'>;

const rendering = {
  subject: { sprite: frontSprite },
} satisfies RenderingControlsFor<'pokemonAbilities'>;

export const pokemonAbilities = {
  rendering,
  levels: {
    4: {
      ...controls,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      plausibleProperties: true,
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['pokemonAbilities'],
  'pokemonAbilities'
>;
