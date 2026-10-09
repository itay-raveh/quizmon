import type {
  FamilyRule,
  PokemonDistractors,
} from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  Renderable,
  PokemonChoices,
} from './types.ts';
import {
  responsePresets,
  spriteSimilarityWeights,
  silhouetteSimilarityWeights,
} from './shared.ts';

export type Rules = FamilyRule<PokemonDistractors, 'pokemon', 'single'>;

export type Rendering = {
  subject?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
  choices?: PokemonChoices;
};

const controls = {
  allowEvolutionRelatives: false,
  view: { answer: { kind: 'pokemon' } },
  similarityWeights: spriteSimilarityWeights,
  silhouetteWeights: silhouetteSimilarityWeights,
  similarityRole: 'choices',
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: null },
  choices: {
    sprite: { silhouetteChance: 0.5 },
    name: 'after-answer',
    number: 'after-answer',
  },
} satisfies Rendering;

export const pokemonMatch = {
  rendering,
  pokemonSprites: ['subject', 'choices'],
  pokemonBackSprites: ['subject', 'choices'],
  levels: {
    1: {
      ...controls,
      distractorRankDirection: 'least-similar',
      response: responsePresets.single,
    },
    3: {
      ...controls,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      distractorPoolSize: 6,
      smallPoolPolicy: 'fixed-size',
      response: responsePresets.single,
    },
    5: {
      ...controls,
      distractorPoolSize: 3,
      smallPoolPolicy: 'fixed-size',
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
