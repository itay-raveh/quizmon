import type {
  FamilyRule,
  PokemonDistractors,
  SearchResponse,
} from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  PokemonChoices,
  PokemonSearch,
  RequiredSubjectSprite,
} from './types.ts';
import {
  responsePresets,
  spriteSimilarityWeights,
  silhouetteSimilarityWeights,
} from './shared.ts';

export type Rules = FamilyRule<
  PokemonDistractors & {
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
  },
  'pokemon',
  'single'
>;

export type Rendering = {
  subject?: RequiredSubjectSprite;
  choices?: PokemonChoices;
  search?: PokemonSearch;
};

const controls = {
  allowEvolutionRelatives: false,
  view: { answer: { kind: 'pokemon' } },
  similarityWeights: spriteSimilarityWeights,
  silhouetteWeights: silhouetteSimilarityWeights,
  similarityRole: 'subject',
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: {
    sprite: { silhouetteChance: 0.5 },
    name: 'after-answer',
    number: 'after-answer',
  },
  choices: { name: 'always', sprite: null },
  search: { sprite: null },
} satisfies Rendering;

export const pokemonIdentification = {
  rendering,
  pokemonSprites: ['subject', 'choices', 'search'],
  pokemonBackSprites: ['subject', 'choices', 'search'],
  levels: {
    1: {
      ...controls,
      distractorRankDirection: 'least-similar',
      response: responsePresets.single,
    },
    2: {
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
      response: {
        kind: 'search',
        selection: 'single',
        candidates: 'pool',
      },
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
