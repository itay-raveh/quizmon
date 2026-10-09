import type { FamilyRule } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  RenderingControls,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Minimum distinct true conditions required for a target. */
    minimumEvolutionConditions: number;
    /** Keep numeric levels and other exact values in condition labels. */
    exactEvolutionValues: boolean;
    /** Shorten condition labels, such as `Trade this Pokémon` to `Trade`. */
    compactEvolutionLabels: boolean;
    /** Include directly used evolution items as conditions. */
    directEvolutionItems: boolean;
    /** Include location-dependent evolution conditions. */
    evolutionLocations: boolean;
    /** Favor numerically nearby wrong condition values. */
    preferCloseConditionValues: boolean;
    /** Permit targets without a Pokémon sprite. */
    allowMissingSprites: boolean;
  },
  'text',
  'single' | 'adaptive'
>;

export type Rendering = RenderingControls<
  never,
  never,
  'sprite' | 'name' | 'number' | 'types'
>;

const controls = {
  view: { answer: { kind: 'text' } },
  minimumEvolutionConditions: 1,
  exactEvolutionValues: false,
  compactEvolutionLabels: false,
  directEvolutionItems: false,
  evolutionLocations: false,
  preferCloseConditionValues: false,
} satisfies QuestionControls<Rules>;

const rendering = {
  related: { sprite: frontSprite },
} satisfies Rendering;

export const evolutionConditions = {
  rendering,
  pokemonSprites: ['related'],
  levels: {
    3: {
      ...controls,
      minimumEvolutionConditions: 1,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      minimumEvolutionConditions: 1,
      evolutionLocations: true,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      minimumEvolutionConditions: 2,
      exactEvolutionValues: true,
      compactEvolutionLabels: true,
      directEvolutionItems: true,
      evolutionLocations: true,
      preferCloseConditionValues: true,
      response: responsePresets.adaptive,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
