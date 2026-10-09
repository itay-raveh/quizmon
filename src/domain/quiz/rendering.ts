import { z } from 'zod';

/** When a name, number, type, or sprite becomes visible to the player. */
export type Visibility = 'always' | 'after-answer' | 'never';
/** Sprite source and appearance; `null` means this role has no sprite. */
export type SpriteRendering = {
  /** When the sprite becomes visible; answering also reveals a clue-gated sprite. */
  reveal: 'always' | 'after-answer' | { afterClues: number };
  /** Keep the sprite concealed until the answer is recorded. */
  silhouette: boolean;
  /** Sample concealment once per role, shared by all its entities. */
  silhouetteChance?: number;
  /** Independently request an older game sprite; unavailable eras fall back to current art. */
  historicalSpriteChance?: number;
  /** Independently request the back view; unavailable backs fall back to front art. */
  backSpriteChance?: number;
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

export type RenderingRole = 'subject' | 'choices' | 'related' | 'search';
/** Resolved policy for the prompt subject, answer choices, related entities, and search entries. */
export type QuestionRendering = Record<
  Exclude<RenderingRole, 'search'>,
  EntityRendering
> & {
  search: EntityRendering & { name: 'always' };
};
/** Sparse per-role policy applied on top of a complete `QuestionRendering`. */
export type EntityRenderingOverrides = Omit<
  Partial<EntityRendering>,
  'sprite'
> & {
  sprite?: Partial<Exclude<SpriteRendering, null>> | null;
};
export type RenderingOverrides = {
  [Role in RenderingRole]?: EntityRenderingOverrides;
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

const mergeEntityRendering = (
  defaults: EntityRendering,
  overrides?: EntityRenderingOverrides,
): EntityRendering => ({
  sprite:
    overrides?.sprite === undefined
      ? defaults.sprite
      : overrides.sprite === null
        ? null
        : {
            reveal: 'always',
            silhouette: false,
            ...defaults.sprite,
            ...overrides.sprite,
          },
  name: overrides?.name ?? defaults.name,
  number: overrides?.number ?? defaults.number,
  types: overrides?.types ?? defaults.types,
});

/** Merge named fields only; omitted role fields retain their previous values. */
export const mergeRendering = (
  defaults: QuestionRendering,
  overrides?: RenderingOverrides,
): QuestionRendering => ({
  subject: mergeEntityRendering(defaults.subject, overrides?.subject),
  choices: mergeEntityRendering(defaults.choices, overrides?.choices),
  related: mergeEntityRendering(defaults.related, overrides?.related),
  search: {
    ...mergeEntityRendering(defaults.search, overrides?.search),
    name: 'always',
  },
});

/** Sample each appearance axis once per role, shared by all its entities. */
export const sampleRendering = (
  rendering: QuestionRendering,
  random: () => number,
): QuestionRendering => {
  const sampled = mergeRendering(rendering);
  const roll = (chance: number) =>
    chance === 1 || (chance > 0 && random() < chance);
  for (const role of ['subject', 'choices', 'related', 'search'] as const) {
    const sprite = sampled[role].sprite;
    if (!sprite) continue;
    const { silhouetteChance, ...fixed } = sprite;
    sampled[role].sprite = {
      ...fixed,
      silhouette:
        silhouetteChance === undefined
          ? sprite.silhouette
          : roll(silhouetteChance),
      historicalSpriteChance: Number(roll(sprite.historicalSpriteChance ?? 0)),
      backSpriteChance: Number(roll(sprite.backSpriteChance ?? 0)),
    };
  }
  return sampled;
};

const visibilitySchema = z.enum(['always', 'after-answer', 'never']);
const spriteRenderingSchema = z
  .object({
    reveal: z.union([
      z.literal('always'),
      z.literal('after-answer'),
      z.object({ afterClues: z.int().min(0) }),
    ]),
    silhouette: z.boolean(),
    silhouetteChance: z.number().min(0).max(1).optional(),
    historicalSpriteChance: z.number().min(0).max(1).optional(),
    backSpriteChance: z.number().min(0).max(1).optional(),
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
