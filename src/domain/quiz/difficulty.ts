export const difficultyLevels = [1, 2, 3, 4, 5] as const;

export type Difficulty = (typeof difficultyLevels)[number];

export const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'number' &&
  difficultyLevels.some((level) => level === value);

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
