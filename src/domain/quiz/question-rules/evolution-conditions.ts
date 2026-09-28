import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'text' } },
  minimumEvolutionConditions: 1,
  exactEvolutionValues: false,
  mixedLevelEvolutionConditions: false,
  compactEvolutionLabels: false,
  exactLevelQuestionChance: 0,
  directEvolutionItems: false,
  evolutionLocations: false,
  preferCloseConditionValues: false,
  allowMissingSprites: false,
} as const satisfies QuestionControlsFor<'evolutionConditions'>;

const rendering = {
  related: { sprite: frontSprite },
} satisfies RenderingControlsFor<'evolutionConditions'>;

export const evolutionConditions = {
  rendering,
  levels: {
    3: {
      ...controls,
      minimumEvolutionConditions: 1,
      mixedLevelEvolutionConditions: true,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      minimumEvolutionConditions: 1,
      mixedLevelEvolutionConditions: true,
      evolutionLocations: true,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      minimumEvolutionConditions: 2,
      exactEvolutionValues: true,
      compactEvolutionLabels: true,
      exactLevelQuestionChance: 0.2,
      directEvolutionItems: true,
      evolutionLocations: true,
      preferCloseConditionValues: true,
      response: responsePresets.adaptive,
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['evolutionConditions'],
  'evolutionConditions'
>;
