import type { questionRuleDefaults } from './shared.ts';
import type { SimilarityWeights } from '../questions/family-rules.ts';
import type { LevelRules } from '../level.ts';
import {
  type EntityRendering,
  type QuestionRendering,
  type RenderingRole,
  type SpriteRendering,
  type EntityRenderingOverrides,
  type Visibility,
} from '../rendering.ts';

export type Renderable<Fields extends keyof EntityRendering> = Pick<
  EntityRenderingOverrides,
  Fields
>;
export type HiddenUntilAnswer = 'after-answer' | 'never';
type VisibleChoice = Extract<Visibility, 'always'>;
export type VisibleChoiceSprite = Partial<Exclude<SpriteRendering, null>> & {
  reveal?: 'always';
};
export type ItemSprite = Partial<Exclude<SpriteRendering, null>> & {
  silhouette?: false;
  silhouetteChance?: never;
  historicalSpriteChance?: never;
  backSpriteChance?: never;
};
export type VisibleItem =
  | {
      name?: Exclude<Visibility, 'never'>;
      sprite?: ItemSprite;
    }
  | { name: VisibleChoice; sprite?: ItemSprite | null }
  | { name?: Visibility; sprite: ItemSprite & { reveal?: 'always' } };
export type ItemChoices = Pick<EntityRenderingOverrides, 'name' | 'sprite'> &
  (
    | { name: VisibleChoice; sprite?: ItemSprite | null }
    | { sprite: ItemSprite & { reveal?: 'always' } }
  );
export type PokemonChoices = EntityRenderingOverrides &
  (
    | { sprite: VisibleChoiceSprite }
    | { name: VisibleChoice }
    | { number: VisibleChoice }
    | { types: VisibleChoice }
  );
export type PokemonSearch = Renderable<'sprite' | 'number' | 'types'>;
export type RequiredSubjectSprite = Omit<
  Renderable<'sprite' | 'name' | 'number' | 'types'>,
  'sprite'
> & { sprite?: VisibleChoiceSprite };
export type HiddenPokemonSubject = {
  name?: HiddenUntilAnswer;
  number?: HiddenUntilAnswer;
  types?: HiddenUntilAnswer;
  sprite?:
    | (Exclude<SpriteRendering, null> & {
        reveal: 'after-answer';
      })
    | null;
};

export type RenderingControls<
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

/** Required family facts stay required; only declared shared defaults may be omitted. */
type AuthoredControls<Rules> = Rules extends { rendering: QuestionRendering }
  ? Omit<
      Rules,
      keyof typeof questionRuleDefaults | 'rendering' | 'similarityWeights'
    > &
      Partial<
        Pick<Rules, Extract<keyof Rules, keyof typeof questionRuleDefaults>>
      > &
      (Rules extends { similarityWeights: SimilarityWeights }
        ? { similarityWeights?: Partial<SimilarityWeights> }
        : unknown)
  : never;

export type QuestionRuleEntry<
  Rules extends { rendering: QuestionRendering },
  Rendering,
> = AuthoredControls<Rules> & { rendering?: Rendering };

type SupportsSpriteDifficulty<Policy> = Policy extends { sprite?: infer Sprite }
  ? Sprite extends { backSpriteChance?: infer Chance }
    ? number extends Chance
      ? true
      : false
    : false
  : false;

type SpriteRoles<Rendering> = {
  [Role in keyof Rendering]: true extends SupportsSpriteDifficulty<
    Rendering[Role]
  >
    ? Role
    : never;
}[keyof Rendering];

export type QuestionRuleRow<
  Rules extends { rendering: QuestionRendering },
  Rendering,
  Entry = QuestionRuleEntry<Rules, Rendering>,
> = {
  active?: boolean;
  /** Roles backed by Pokémon assets receive the shared level difficulty unless overridden. */
  pokemonSprites?: readonly Extract<SpriteRoles<Rendering>, RenderingRole>[];
  /** Back-view difficulty is opt-in; other Pokémon roles retain a zero default. */
  pokemonBackSprites?: readonly Extract<
    SpriteRoles<Rendering>,
    RenderingRole
  >[];
  rendering?: Rendering;
  levels: LevelRules<Entry>;
};

export type QuestionControls<
  Rules extends { view: unknown; rendering: QuestionRendering },
> = Partial<Omit<AuthoredControls<Rules>, 'response' | 'view'>> & {
  view: Rules['view'];
};
