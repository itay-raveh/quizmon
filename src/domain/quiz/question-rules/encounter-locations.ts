import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'pokemon' } },
  sameEncounterMethodWeight: 100,
  encounterConditions: false,
  closeAlternatives: false,
  similarityWeights: {
    sharedType: 12,
    shape: 8,
    color: 5,
    generation: 4,
    evolutionStage: 3,
    statMaximum: 3,
    statScale: 80,
  },
} as const satisfies QuestionControlsFor<'encounterLocations'>;

const rendering = {} satisfies RenderingControlsFor<'encounterLocations'>;

export const encounterLocations = {
  rendering,
  levels: {
    4: {
      ...controls,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      encounterConditions: true,
      closeAlternatives: true,
      response: responsePresets.multi,
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['encounterLocations'],
  'encounterLocations'
>;
