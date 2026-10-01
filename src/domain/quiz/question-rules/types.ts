import type { DifficultyRules } from '../difficulty.ts';
import {
  type EntityRendering,
  type QuestionRendering,
  type SpriteRendering,
  type Visibility,
} from '../rendering.ts';
import type { FamilyRules } from '../questions/family-rules.ts';

type Renderable<Fields extends keyof EntityRendering> = Partial<
  Pick<EntityRendering, Fields>
>;
type HiddenUntilAnswer = 'after-answer' | 'never';
type VisibleChoice = Extract<Visibility, 'always'>;
type VisibleChoiceSprite = Exclude<SpriteRendering, null> & {
  reveal: 'always';
  source: 'front' | 'all';
};
type ItemSprite = Exclude<SpriteRendering, null> & {
  silhouette: false;
  source?: never;
};
type VisibleItem =
  | {
      name?: Exclude<Visibility, 'never'>;
      sprite?: ItemSprite;
    }
  | { name: VisibleChoice; sprite?: ItemSprite | null }
  | { name?: Visibility; sprite: ItemSprite & { reveal: 'always' } };
type ItemChoices = Partial<Pick<EntityRendering, 'name' | 'sprite'>> &
  (
    | { name: VisibleChoice; sprite?: ItemSprite | null }
    | { sprite: ItemSprite & { reveal: 'always' } }
  );
type PokemonChoices = Partial<EntityRendering> &
  (
    | { sprite: VisibleChoiceSprite }
    | { name: VisibleChoice }
    | { number: VisibleChoice }
    | { types: VisibleChoice }
  );
type PokemonSearch = Renderable<'sprite' | 'number' | 'types'>;
type RequiredSubjectSprite = Omit<
  Renderable<'sprite' | 'name' | 'number' | 'types'>,
  'sprite'
> & { sprite?: VisibleChoiceSprite };
type FrontSubjectSprite = Omit<RequiredSubjectSprite, 'sprite'> & {
  sprite?: VisibleChoiceSprite & { source: 'front' };
};
type FrontPokemonChoices = Partial<Omit<EntityRendering, 'sprite'>> & {
  sprite?: (VisibleChoiceSprite & { source: 'front' }) | null;
} & (
    | { sprite: VisibleChoiceSprite & { source: 'front' } }
    | { name: VisibleChoice }
    | { number: VisibleChoice }
    | { types: VisibleChoice }
  );
type HiddenPokemonSubject = {
  name?: HiddenUntilAnswer;
  number?: HiddenUntilAnswer;
  types?: HiddenUntilAnswer;
  sprite?:
    | (Exclude<SpriteRendering, null> & {
        reveal: 'after-answer';
      })
    | null;
};

type RenderingControls<
  Subject extends keyof EntityRendering = never,
  Choices extends keyof EntityRendering = never,
  Related extends keyof EntityRendering = never,
  Search extends keyof EntityRendering = never,
> = {
  /** Prompt subject fields this family can change. */
  subject?: [Subject] extends [never] ? never : Renderable<Subject>;
  /** Answer choice fields this family can change. */
  choices?: [Choices] extends [never] ? never : Renderable<Choices>;
  /** Related-entity fields this family can change. */
  related?: [Related] extends [never] ? never : Renderable<Related>;
  /** Search-result fields this family can change. */
  search?: [Search] extends [never] ? never : Renderable<Search>;
};

/** Only fields with a real rendering consumer are configurable per family. */
type FamilyRenderingControls = {
  itemIdentification: {
    subject?: VisibleItem;
    choices?: ItemChoices;
    search?: { sprite?: ItemSprite | null };
  };
  itemUses: { subject?: VisibleItem };
  abilityEffects: RenderingControls<'sprite'>;
  heldItemEffects: { subject?: VisibleItem };
  hiddenAbilities: RenderingControls<'sprite' | 'name' | 'number' | 'types'>;
  evYields: RenderingControls<'sprite' | 'name' | 'number' | 'types'>;
  berryFlavors: { subject?: VisibleItem };
  naturalGift: { subject?: VisibleItem };
  weightComparison: { choices?: PokemonChoices };
  heightComparison: { choices?: PokemonChoices };
  pokedexCategories: { choices?: PokemonChoices };
  evolutionConditions: RenderingControls<
    never,
    never,
    'sprite' | 'name' | 'number' | 'types'
  >;
  encounterLocations: { choices?: PokemonChoices };
  shinyPokemonIdentification: { choices?: FrontPokemonChoices };
  pokedexEntryMatch: {
    subject?: HiddenPokemonSubject;
    choices?: PokemonChoices;
    search?: PokemonSearch;
  };
  legendaryMythicalSelection: { choices?: PokemonChoices };
  statExtremes: { choices?: PokemonChoices };
  pokemonFromHistoricalSprite: {
    subject?: RequiredSubjectSprite;
    choices?: PokemonChoices;
    search?: PokemonSearch;
  };
  spriteForPokemon: {
    subject?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
    choices?: PokemonChoices;
  };
  silhouetteForPokemon: {
    subject?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
    choices?: PokemonChoices;
  };
  pokemonFromSilhouette: {
    subject?: RequiredSubjectSprite;
    choices?: PokemonChoices;
    search?: PokemonSearch;
  };
  pokemonFromPixelCrop: {
    subject?: FrontSubjectSprite;
    choices?: PokemonChoices;
    search?: PokemonSearch;
  };
  pokemonByGeneration: { choices?: PokemonChoices };
  pokemonTypes: {
    subject?: Renderable<'sprite' | 'name' | 'number'> & {
      types?: 'after-answer';
    };
  };
  typeOddOneOut: { choices?: PokemonChoices };
  pokemonByType: { choices?: PokemonChoices };
  dualTypeMatch: {
    subject?: Renderable<'sprite' | 'name' | 'number'> & {
      types?: HiddenUntilAnswer;
    };
    choices?: PokemonChoices;
  };
  typeMatchup: RenderingControls<'sprite' | 'name' | 'number' | 'types'>;
  evolutionChain: {
    subject?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
    choices?: PokemonChoices;
    related?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
    search?: PokemonSearch;
  };
  evolutionGainedType: RenderingControls<
    'sprite' | 'name' | 'number' | 'types',
    never,
    'sprite' | 'name' | 'number' | 'types'
  >;
  superEffectiveAttacker: {
    subject?: Renderable<'sprite' | 'name' | 'number'> & {
      types?: 'always' | 'after-answer';
    };
    choices?: PokemonChoices;
    related?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
  };
  champion: {
    subject?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
    choices?: PokemonChoices;
    search?: PokemonSearch;
  };
  pokemonAbilities: RenderingControls<'sprite' | 'name' | 'number' | 'types'>;
  levelUpMoves: RenderingControls<'sprite' | 'name' | 'number' | 'types'>;
};

/**
 * Rendering overrides a family can consume. Unsupported roles, fields, and
 * answer-revealing values fail at configuration time.
 */
export type RenderingControlsFor<Type extends keyof FamilyRules> =
  Type extends keyof FamilyRenderingControls
    ? FamilyRenderingControls[Type]
    : RenderingControls;

/**
 * Complete controls for one level. `rendering` overrides
 * the family policy; controls do not inherit from lower levels.
 */
export type QuestionRuleEntry<
  Rules extends { rendering: QuestionRendering; response: { kind: string } },
  Type extends keyof FamilyRules,
> = Type extends 'pokedexEntryMatch'
  ? Omit<Rules, 'rendering' | 'response'> &
      (
        | {
            response: Extract<Rules['response'], { kind: 'search' }>;
            rendering?: RenderingControlsFor<Type>;
          }
        | {
            response: Exclude<Rules['response'], { kind: 'search' }>;
            rendering?: Omit<RenderingControlsFor<Type>, 'subject'>;
          }
      )
  : Omit<Rules, 'rendering'> & {
      /** Visibility changes applied after the family policy. */
      rendering?: RenderingControlsFor<Type>;
    };

/**
 * One family's rules. Numeric `levels` may be sparse; resolution uses the
 * latest entry at or below the requested difficulty.
 */
export type QuestionRuleRow<
  Rules extends { rendering: QuestionRendering; response: { kind: string } },
  Type extends keyof FamilyRules,
> = {
  /** Family visibility changes applied after the base policy. */
  rendering: RenderingControlsFor<Type>;
  /** Sparse rules. A `null` entry ends availability until another rule. */
  levels: DifficultyRules<QuestionRuleEntry<Rules, Type>>;
};

/** Shared controls required by one family's rule entries. */
export type QuestionControlsFor<Type extends keyof FamilyRules> = Partial<
  Omit<FamilyRules[Type], 'response' | 'rendering' | 'view'>
> & { view: FamilyRules[Type]['view'] };
