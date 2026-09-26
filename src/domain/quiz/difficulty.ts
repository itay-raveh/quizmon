import { z } from 'zod';

export const difficultyLevels = [1, 2, 3, 4, 5] as const;

export const difficultySchema = z.literal(difficultyLevels);
export type Difficulty = z.infer<typeof difficultySchema>;

export type DifficultyRules<Rules> = {
  [Level in Difficulty]: Readonly<
    Record<Level, Rules> & Partial<Record<Exclude<Difficulty, Level>, Rules>>
  >;
}[Difficulty];

export type DifficultyVariants<Variant> = Readonly<
  Partial<Record<Difficulty, Variant>>
>;

export const resolveDifficultyVariant = <Variant>(
  variants: DifficultyVariants<Variant>,
  difficulty: Difficulty,
): { level: Difficulty; variant: Variant } | undefined => {
  for (const level of [...difficultyLevels].reverse()) {
    const variant = variants[level];
    if (level <= difficulty && variant !== undefined) {
      return { level, variant };
    }
  }
  return undefined;
};
