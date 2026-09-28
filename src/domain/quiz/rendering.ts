import { z } from 'zod';

/** When a name, number, type, or sprite becomes visible to the player. */
export type Visibility = 'always' | 'after-answer' | 'never';
/** Sprite source and appearance; `null` means this role has no sprite. */
export type SpriteRendering = {
  /** When the sprite becomes visible; answering also reveals a clue-gated sprite. */
  reveal: 'always' | 'after-answer' | { afterClues: number };
  /** Keep the sprite concealed until the answer is recorded. */
  silhouette: boolean;
  /** Pokémon use the current front by default or sample all available sprites. */
  source?: 'front' | 'all';
} | null;

/** Visibility fields for one entity role. */
export interface EntityRendering {
  /** Sprite appearance and source; `null` hides the sprite. */
  sprite: SpriteRendering;
  /** Whether the entity's name is visible. */
  name: Visibility;
  /** Whether its National Pokédex number is visible. */
  number: Visibility;
  /** Whether type badges are visible when that role renders types. */
  types: Visibility;
}

type RenderingRole = 'subject' | 'choices' | 'related' | 'search';
/** Resolved policy for the prompt subject, answer choices, related entities, and search entries. */
export type QuestionRendering = Record<
  Exclude<RenderingRole, 'search'>,
  EntityRendering
> & {
  search: EntityRendering & { name: 'always' };
};
/** Sparse per-role policy applied on top of a complete `QuestionRendering`. */
export type RenderingOverrides = {
  [Role in RenderingRole]?: Partial<QuestionRendering[Role]>;
};

export interface RevealState {
  answered: boolean;
  cluesShown: number;
}

/** `after-answer` becomes visible only after the answer is recorded. */
export const isVisible = (
  rule: Visibility,
  { answered }: RevealState,
): boolean => rule === 'always' || (rule === 'after-answer' && answered);

/** Resolve whether a sprite is shown and whether it remains silhouetted. */
export const spriteState = (rule: SpriteRendering, state: RevealState) => ({
  visible:
    rule !== null &&
    (typeof rule.reveal === 'object'
      ? state.answered || state.cluesShown >= rule.reveal.afterClues
      : isVisible(rule.reveal, state)),
  silhouette: rule !== null && !state.answered && rule.silhouette,
});

const mergeEntityRendering = <Policy extends EntityRendering>(
  defaults: Policy,
  overrides?: Partial<Policy>,
): Policy =>
  ({
    sprite:
      overrides?.sprite === undefined ? defaults.sprite : overrides.sprite,
    name: overrides?.name ?? defaults.name,
    number: overrides?.number ?? defaults.number,
    types: overrides?.types ?? defaults.types,
  }) as Policy;

/** Merge named fields only; omitted role fields retain their previous values. */
export const mergeRendering = (
  defaults: QuestionRendering,
  overrides?: RenderingOverrides,
): QuestionRendering => ({
  subject: mergeEntityRendering(defaults.subject, overrides?.subject),
  choices: mergeEntityRendering(defaults.choices, overrides?.choices),
  related: mergeEntityRendering(defaults.related, overrides?.related),
  search: mergeEntityRendering(defaults.search, overrides?.search),
});

const visibilitySchema = z.enum(['always', 'after-answer', 'never']);
const spriteRenderingSchema = z
  .object({
    reveal: z.union([
      z.literal('always'),
      z.literal('after-answer'),
      z.object({ afterClues: z.int().min(0) }),
    ]),
    silhouette: z.boolean(),
    source: z.enum(['front', 'all']).optional(),
  })
  .nullable();
const entityRenderingSchema = z.object({
  sprite: spriteRenderingSchema,
  name: visibilitySchema,
  number: visibilitySchema,
  types: visibilitySchema,
});

/** Validate a complete saved rendering snapshot, not a sparse override. */
export const questionRenderingSchema = z.object({
  subject: entityRenderingSchema,
  choices: entityRenderingSchema,
  related: entityRenderingSchema,
  search: entityRenderingSchema.extend({ name: z.literal('always') }),
});
