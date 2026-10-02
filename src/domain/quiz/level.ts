import { z } from 'zod';

export const gameLevels = [1, 2, 3, 4, 5] as const;

export const levelSchema = z.literal(gameLevels);
/** Public game levels accepted by sparse question rule maps. */
export type Level = z.infer<typeof levelSchema>;

/** A sparse numeric level map with at least one active level. */
export type LevelRules<Rules> = {
  [Step in Level]: Readonly<
    Record<Step, Rules> & Partial<Record<Exclude<Level, Step>, Rules | null>>
  >;
}[Level];

export type LevelVariants<Variant> = Readonly<Partial<Record<Level, Variant>>>;

/**
 * @param variants - Sparse rules indexed by level. `null` ends an active range.
 * @param requestedLevel - Highest level the caller may use.
 * @returns The latest rule at or below `requestedLevel`, unless that entry is `null`.
 */
export const resolveLevelVariant = <Variant>(
  variants: LevelVariants<Variant | null>,
  requestedLevel: Level,
): { level: Level; variant: Variant } | undefined => {
  for (const level of [...gameLevels].reverse()) {
    const variant = variants[level];
    if (level <= requestedLevel && variant !== undefined) {
      return variant === null ? undefined : { level, variant };
    }
  }
  return undefined;
};
