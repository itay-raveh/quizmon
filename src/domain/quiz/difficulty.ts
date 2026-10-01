import { z } from 'zod';

export const difficultyLevels = [1, 2, 3, 4, 5] as const;

export const difficultySchema = z.literal(difficultyLevels);
/** Public game levels accepted by sparse question rule maps. */
export type Difficulty = z.infer<typeof difficultySchema>;

/** A sparse numeric level map with at least one active level. */
export type DifficultyRules<Rules> = {
  [Level in Difficulty]: Readonly<
    Record<Level, Rules> &
      Partial<Record<Exclude<Difficulty, Level>, Rules | null>>
  >;
}[Difficulty];

export type DifficultyVariants<Variant> = Readonly<
  Partial<Record<Difficulty, Variant>>
>;

/**
 * @param variants - Sparse rules indexed by difficulty. `null` ends an active range.
 * @param difficulty - Highest level the caller may use.
 * @returns The latest rule at or below `difficulty`, unless that entry is `null`.
 */
export const resolveDifficultyVariant = <Variant>(
  variants: DifficultyVariants<Variant | null>,
  difficulty: Difficulty,
): { level: Difficulty; variant: Variant } | undefined => {
  for (const level of [...difficultyLevels].reverse()) {
    const variant = variants[level];
    if (level <= difficulty && variant !== undefined) {
      return variant === null ? undefined : { level, variant };
    }
  }
  return undefined;
};
