import { z } from 'zod';

export type Visibility = 'always' | 'after-answer' | 'never';
export type SpriteVisibility =
  Visibility | 'silhouette' | { afterClues: number; silhouette?: boolean };

export interface EntityRendering {
  sprite: SpriteVisibility;
  name: Visibility;
  number: Visibility;
  types?: Visibility;
}

type RenderingRole = 'subject' | 'choices' | 'related' | 'search';
export type QuestionRendering = Record<RenderingRole, EntityRendering>;
export type RenderingOverrides = {
  [Role in RenderingRole]?: Partial<EntityRendering>;
};

export interface RevealState {
  answered: boolean;
  cluesShown: number;
}

export const isVisible = (
  rule: Visibility,
  { answered }: RevealState,
): boolean => rule === 'always' || (rule === 'after-answer' && answered);

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

const mergeEntityRendering = (
  defaults: EntityRendering,
  overrides?: Partial<EntityRendering>,
): EntityRendering => ({
  sprite: overrides?.sprite ?? defaults.sprite,
  name: overrides?.name ?? defaults.name,
  number: overrides?.number ?? defaults.number,
  types: overrides?.types ?? defaults.types ?? 'always',
});

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

export const questionRenderingSchema = z.object({
  subject: entityRenderingSchema,
  choices: entityRenderingSchema,
  related: entityRenderingSchema,
  search: entityRenderingSchema,
});
