import { difficultyLevels, resolveDifficultyVariant } from './difficulty';
import {
  expansionVariants,
  type ExpansionVariantRules,
} from './question-expansion-variants';

it('implements the approved entry counts without registering later families early', () => {
  expect(Object.keys(expansionVariants)).toHaveLength(20);
  expect(
    difficultyLevels.map(
      (level) =>
        Object.values(expansionVariants).filter((variants) =>
          resolveDifficultyVariant<ExpansionVariantRules>(variants, level),
        ).length,
    ),
  ).toEqual([6, 10, 13, 19, 20]);
});

it('retains entire checkpoint rules through plateaus', () => {
  for (const variants of Object.values(expansionVariants)) {
    for (const level of difficultyLevels) {
      const eligible = Object.keys(variants)
        .map(Number)
        .filter((n) => n <= level);
      const resolved = resolveDifficultyVariant<ExpansionVariantRules>(
        variants,
        level,
      );
      if (!eligible.length) expect(resolved).toBeUndefined();
      else
        expect(resolved).toEqual({
          level: Math.max(...eligible),
          variant: variants[Math.max(...eligible) as keyof typeof variants],
        });
    }
  }
});

it('keeps inherited restrictions in later complete checkpoints', () => {
  expect(expansionVariants['medicine-cabinet'][4]).toEqual({
    itemChoices: 'medicines',
    namesOnly: true,
    combinedCure: true,
  });
  expect(expansionVariants['baby-pokemon'][4]).toEqual({
    unevolvedDistractors: true,
    namesOnly: true,
  });
  expect(expansionVariants['move-purpose'][4]).toEqual({
    damageClass: 'any',
    sameMoveType: true,
  });
  expect(expansionVariants['pokedex-categories'][4]).toEqual({
    sameColorOrShape: true,
    namesOnly: true,
  });
});
