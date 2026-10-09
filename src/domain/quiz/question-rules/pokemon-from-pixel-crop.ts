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
  VisibleChoiceSprite,
} from './types.ts';
import {
  frontSprite,
  responsePresets,
  pixelSimilarityWeights,
} from './shared.ts';

export type Rules = FamilyRule<
  PokemonDistractors & {
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
    /** Multiplier applied to the generated pixel-crop zoom. */
    cropScale: number;
  },
  'pokemon',
  'single'
>;

type CurrentFrontSubjectSprite = RequiredSubjectSprite & {
  sprite?: VisibleChoiceSprite & {
    historicalSpriteChance?: 0;
    backSpriteChance?: 0;
  };
};

export type Rendering = {
  subject?: CurrentFrontSubjectSprite;
  choices?: PokemonChoices;
  search?: PokemonSearch;
};

const controls = {
  allowEvolutionRelatives: false,
  view: { answer: { kind: 'pokemon' } },
  similarityWeights: pixelSimilarityWeights,

  cropScale: 1,
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: {
    sprite: frontSprite,
    name: 'after-answer',
    number: 'after-answer',
  },
  choices: { name: 'always', sprite: null },
  search: { sprite: null },
} satisfies Rendering;

export const pokemonFromPixelCrop = {
  rendering,
  levels: {
    1: {
      ...controls,
      cropScale: 0.45,
      response: responsePresets.single,
    },
    2: {
      ...controls,
      cropScale: 0.55,
      response: responsePresets.single,
    },
    3: {
      ...controls,
      cropScale: 0.65,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      cropScale: 0.8,

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
      cropScale: 1,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
