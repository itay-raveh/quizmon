import type {
  FamilyRule,
  PokemonDistractors,
  SearchResponse,
} from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  Renderable,
  PokemonChoices,
  PokemonSearch,
} from './types.ts';
import { frontSprite, answerSprite, responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  PokemonDistractors & {
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
  },
  'pokemon',
  'single'
>;

export type Rendering = {
  subject?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
  choices?: PokemonChoices;
  related?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
  search?: PokemonSearch;
};

const controls = {
  view: { answer: { kind: 'pokemon' } },
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: {
    sprite: answerSprite,
    name: 'after-answer',
    number: 'after-answer',
  },
  choices: { name: 'always', sprite: null, number: 'never' },
  related: { sprite: frontSprite },
  search: { sprite: null },
} satisfies Rendering;

export const evolutionChain = {
  rendering,
  pokemonSprites: ['subject', 'choices', 'related', 'search'],
  levels: {
    2: {
      ...controls,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      response: {
        kind: 'search',
        selection: 'single',
        candidates: 'pool',
      },
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
