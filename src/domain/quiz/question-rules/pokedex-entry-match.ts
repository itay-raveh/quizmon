import type {
  FamilyRule,
  PokemonDistractors,
  SearchResponse,
} from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleEntry,
  QuestionRuleRow,
  PokemonChoices,
  PokemonSearch,
  HiddenPokemonSubject,
} from './types.ts';
import { answerSprite, responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  PokemonDistractors & {
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
  },
  'pokemon',
  'single'
>;

export type Rendering = {
  subject?: HiddenPokemonSubject;
  choices?: PokemonChoices;
  search?: PokemonSearch;
};

export type Entry = Omit<
  QuestionRuleEntry<Rules, Rendering>,
  'rendering' | 'response'
> &
  (
    | {
        response: Extract<Rules['response'], { kind: 'search' }>;
        rendering?: Rendering;
      }
    | {
        response: Exclude<Rules['response'], { kind: 'search' }>;
        rendering?: Omit<Rendering, 'subject'>;
      }
  );

const controls = {
  view: { answer: { kind: 'pokemon' } },
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { name: 'never', number: 'never' },
} satisfies Rendering;

export const pokedexEntryMatch = {
  rendering,
  pokemonSprites: ['subject', 'choices', 'search'],
  levels: {
    4: {
      ...controls,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      response: {
        kind: 'search',
        selection: 'single',
        candidates: 'pool',
      },
      rendering: {
        subject: {
          sprite: answerSprite,
          name: 'after-answer',
          number: 'after-answer',
        },
      },
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering, Entry>;
