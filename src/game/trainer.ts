import type { TrainerStats } from './storage';
import type { QuestionCategory } from './types';

export const trainerCategoryLabels: Record<QuestionCategory, string> = {
  ability: 'Abilities',
  champion: 'Champion rounds',
  description: 'Field notes',
  evolution: 'Evolutions',
  identity: 'Pokémon identity',
  matchup: 'Matchups',
  move: 'Moves',
  stat: 'Stats',
  type: 'Types',
};

export type TrainerRank = 'New Trainer' | 'Researcher' | 'Ace' | 'Champion';
export type CardFinish = 'Classic' | 'Shimmer' | 'Aurora' | 'Master';
export type TrainerCardFace = 'front' | 'records';
export type TrainerStampId =
  | 'perfect-form'
  | 'many-paths'
  | 'world-tour'
  | 'champions-instinct'
  | 'daily-resolve';
export type TrainerStampTier = 0 | 1 | 2 | 3;

export interface TrainerStamp {
  current: number;
  goal: number;
  id: TrainerStampId;
  label: string;
  mastered: boolean;
  requirement: string;
  tier: TrainerStampTier;
}

export interface TrainerStampChange {
  fromTier: TrainerStampTier;
  id: TrainerStampId;
  label: string;
  tier: Exclude<TrainerStampTier, 0>;
}

interface StampDefinition {
  current: number;
  id: TrainerStampId;
  label: string;
  requirement: (goal: number) => string;
  thresholds: readonly [number, number, number];
}

const getTier = (
  current: number,
  thresholds: StampDefinition['thresholds'],
): TrainerStampTier =>
  thresholds.reduce<TrainerStampTier>(
    (tier, threshold) =>
      current >= threshold ? ((tier + 1) as TrainerStampTier) : tier,
    0,
  );

const makeStamp = (definition: StampDefinition): TrainerStamp => {
  const tier = getTier(definition.current, definition.thresholds);
  const mastered = tier === 3;
  const goal = definition.thresholds[Math.min(tier, 2)]!;

  return {
    current: definition.current,
    goal,
    id: definition.id,
    label: definition.label,
    mastered,
    requirement: mastered
      ? 'All three tiers earned'
      : definition.requirement(goal),
    tier,
  };
};

export const getTrainerStamps = (stats: TrainerStats): TrainerStamp[] => {
  const questionTypesMastered = Object.values(
    stats.correctQuestionTypes,
  ).filter((correct) => correct > 0).length;
  const generationsMastered = Object.values(stats.correctGenerations).filter(
    (correct) => correct > 0,
  ).length;

  return [
    makeStamp({
      current: stats.masteryRounds,
      id: 'perfect-form',
      label: 'Perfect Form',
      requirement: (goal) =>
        `Finish ${goal} perfect Standard or Long Training ${goal === 1 ? 'round' : 'rounds'}`,
      thresholds: [1, 3, 10],
    }),
    makeStamp({
      current: questionTypesMastered,
      id: 'many-paths',
      label: 'Many Paths',
      requirement: (goal) =>
        `Answer correctly in ${goal} different question formats`,
      thresholds: [5, 10, 15],
    }),
    makeStamp({
      current: generationsMastered,
      id: 'world-tour',
      label: 'World Tour',
      requirement: (goal) =>
        `Answer correctly across ${goal} Pokémon generations`,
      thresholds: [3, 6, 9],
    }),
    makeStamp({
      current: stats.championAnswersWithoutClues,
      id: 'champions-instinct',
      label: "Champion's Instinct",
      requirement: (goal) =>
        `Solve ${goal} Champion ${goal === 1 ? 'question' : 'questions'} without clues`,
      thresholds: [1, 5, 15],
    }),
    makeStamp({
      current: stats.bestDailyStreak,
      id: 'daily-resolve',
      label: 'Daily Resolve',
      requirement: (goal) => `Reach a ${goal}-day Daily Combo`,
      thresholds: [3, 7, 30],
    }),
  ];
};

export const getEarnedTrainerTierCount = (stats: TrainerStats): number =>
  getTrainerStamps(stats).reduce((total, stamp) => total + stamp.tier, 0);

export const formatTrainerStampTier = (tier: TrainerStampTier): string =>
  ['Unmarked', 'Tier I', 'Tier II', 'Tier III'][tier] ?? 'Unmarked';

export const getTrainerRank = (stats: TrainerStats): TrainerRank => {
  const earnedTiers = getEarnedTrainerTierCount(stats);
  if (earnedTiers === 15) return 'Champion';
  if (earnedTiers >= 8) return 'Ace';
  if (earnedTiers >= 3) return 'Researcher';
  return 'New Trainer';
};

export const getCardFinish = (rank: TrainerRank): CardFinish => {
  if (rank === 'Champion') return 'Master';
  if (rank === 'Ace') return 'Aurora';
  if (rank === 'Researcher') return 'Shimmer';
  return 'Classic';
};

export const getTrainerStampChanges = (
  before: TrainerStats,
  after: TrainerStats,
): TrainerStampChange[] => {
  const previousTiers = new Map(
    getTrainerStamps(before).map((stamp) => [stamp.id, stamp.tier]),
  );

  return getTrainerStamps(after).flatMap((stamp) => {
    const fromTier = previousTiers.get(stamp.id) ?? 0;
    return stamp.tier > fromTier
      ? [
          {
            fromTier,
            id: stamp.id,
            label: stamp.label,
            tier: stamp.tier as Exclude<TrainerStampTier, 0>,
          },
        ]
      : [];
  });
};
