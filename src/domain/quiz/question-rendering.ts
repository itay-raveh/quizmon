import { z } from 'zod';

/** When a name, number, type, or sprite becomes visible to the player. */
export type Visibility = 'always' | 'after-answer' | 'never';
/**
 * Sprite visibility also supports a concealed silhouette and clue-count reveal.
 * `afterClues` is a nonnegative integer in saved questions; answering also reveals it.
 */
export type SpriteVisibility =
  Visibility | 'silhouette' | { afterClues: number; silhouette?: boolean };

/** Visibility fields for one entity role; omitted `types` defaults to `always`. */
export interface EntityRendering {
  /** Sprite appearance, including silhouette and clue-count reveal. */
  sprite: SpriteVisibility;
  /** Whether the entity's name is visible. */
  name: Visibility;
  /** Whether its National Pokédex number is visible. */
  number: Visibility;
  /** Whether type badges are visible when that role renders types. */
  types?: Visibility;
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
export const spriteState = (rule: SpriteVisibility, state: RevealState) => ({
  visible:
    typeof rule === 'object'
      ? state.answered || state.cluesShown >= rule.afterClues
      : rule === 'silhouette' || isVisible(rule, state),
  silhouette:
    !state.answered &&
    (typeof rule === 'object'
      ? Boolean(rule.silhouette)
      : rule === 'silhouette'),
});

const mergeEntityRendering = <Policy extends EntityRendering>(
  defaults: Policy,
  overrides?: Partial<Policy>,
): Policy =>
  ({
    sprite: overrides?.sprite ?? defaults.sprite,
    name: overrides?.name ?? defaults.name,
    number: overrides?.number ?? defaults.number,
    types: overrides?.types ?? defaults.types ?? 'always',
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
const spriteVisibilitySchema = z.union([
  visibilitySchema,
  z.literal('silhouette'),
  z.object({
    afterClues: z.int().min(0),
    silhouette: z.boolean().optional(),
  }),
]);
const entityRenderingSchema = z.object({
  sprite: spriteVisibilitySchema,
  name: visibilitySchema,
  number: visibilitySchema,
  types: visibilitySchema.optional(),
});

/** Validate a complete saved rendering snapshot, not a sparse override. */
export const questionRenderingSchema = z.object({
  subject: entityRenderingSchema,
  choices: entityRenderingSchema,
  related: entityRenderingSchema,
  search: entityRenderingSchema.extend({ name: z.literal('always') }),
});
