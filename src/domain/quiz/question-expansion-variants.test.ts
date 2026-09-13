import { difficultyLevels, resolveDifficultyVariant } from './difficulty';
import {
  expansionVariants,
  type ExpansionVariantRules,
} from './question-variants';

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
