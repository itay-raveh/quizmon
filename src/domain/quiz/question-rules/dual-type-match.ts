import type {
  FamilyRule,
  PokemonDistractors,
} from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  Renderable,
  HiddenUntilAnswer,
  PokemonChoices,
} from './types.ts';
import {
  frontSprite,
  responsePresets,
  typeSimilarityWeights,
} from './shared.ts';

export type Rules = FamilyRule<PokemonDistractors, 'pokemon', 'single'>;

export type Rendering = {
  subject?: Renderable<'sprite' | 'name' | 'number'> & {
    types?: HiddenUntilAnswer;
  };
  choices?: PokemonChoices;
};

const controls = {
  view: { answer: { kind: 'pokemon' } },
  similarityWeights: typeSimilarityWeights,
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: frontSprite, types: 'after-answer' },
  choices: { name: 'always', types: 'after-answer' },
} satisfies Rendering;

export const dualTypeMatch = {
  rendering,
  pokemonSprites: ['subject', 'choices'],
  levels: {
    3: {
      ...controls,
      response: responsePresets.single,
    },
    5: null,
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
