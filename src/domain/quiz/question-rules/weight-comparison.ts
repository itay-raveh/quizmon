import type { MeasurementRules } from '../measurement-comparison.ts';
import type { FamilyRule } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  PokemonChoices,
} from './types.ts';
import { responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Ratio and spread limits for four Pokémon weights. */
    measurement: MeasurementRules;
  },
  'pokemon',
  'single'
>;

export type Rendering = { choices?: PokemonChoices };

const controls = {
  view: { answer: { kind: 'pokemon' } },
} satisfies QuestionControls<Rules>;

export const weightComparison = {
  pokemonSprites: ['choices'],
  levels: {
    2: {
      ...controls,
      measurement: {
        minimumRatio: 2,
        maximumRatio: Infinity,
        maximumSpread: Infinity,
      },
      response: responsePresets.single,
    },
    3: {
      ...controls,
      measurement: {
        minimumRatio: 1.3,
        maximumRatio: Infinity,
        maximumSpread: Infinity,
      },
      response: responsePresets.single,
    },
    4: {
      ...controls,
      measurement: {
        minimumRatio: 1.3,
        maximumRatio: 2,
        maximumSpread: 2,
      },
      response: responsePresets.single,
    },
    5: {
      ...controls,
      rendering: { choices: { name: 'always', sprite: null } },
      measurement: {
        minimumRatio: 1.3,
        maximumRatio: 1.5,
        maximumSpread: 1.5,
      },
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
