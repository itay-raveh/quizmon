// Bump the saved Training score version before changing these values.
export const trainingScoring = {
  basePoints: 1000,
  levelFactor: 1.6,
  carriedRuleFactor: 0.8,
  speedBonusRate: 0.5,
  speedBonusHalfLifeMilliseconds: 10_000,
} as const;

export const getTrainingLevelFactor = (level: number): number =>
  trainingScoring.levelFactor ** (level - 1);

export const getTrainingRuleFactor = (
  level: number,
  ruleLevel: number,
): number => trainingScoring.carriedRuleFactor ** (level - ruleLevel);
