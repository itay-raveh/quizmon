import type { TrainerStats } from './storage';
import type { QuestionCategory } from './types';

const TRAINER_SPECIALTY_GOAL = 10;

export const trainerSpecialtyLabels = {
  ability: 'Ability Specialist',
  description: 'Field Researcher',
  evolution: 'Evolution Specialist',
  identity: 'Pokédex Specialist',
  matchup: 'Battle Strategist',
  move: 'Move Specialist',
  stat: 'Stat Specialist',
  type: 'Type Specialist',
} as const satisfies Partial<Record<QuestionCategory, string>>;

export type TrainerSpecialty = keyof typeof trainerSpecialtyLabels;
export type TrainerRank =
  'Youngster' | 'Rising Star' | 'Ace Trainer' | 'Champion';
export type CardFinish = 'Classic' | 'Shimmer' | 'Aurora' | 'Master';
export type TrainerCardFace = 'front' | 'records';
export type TrainerBadgeId =
  | 'perfect-form'
  | 'many-paths'
  | 'world-tour'
  | 'champions-instinct'
  | 'daily-resolve';

export interface TrainerBadge {
  current: number;
  earned: boolean;
  goal: number;
  id: TrainerBadgeId;
  label: string;
  requirement: string;
}

export interface TrainerBadgeChange {
  id: TrainerBadgeId;
  label: string;
}

interface BadgeDefinition {
  current: number;
  goal: number;
  id: TrainerBadgeId;
  label: string;
  requirement: (goal: number) => string;
}

const makeBadge = (definition: BadgeDefinition): TrainerBadge => ({
  current: definition.current,
  earned: definition.current >= definition.goal,
  goal: definition.goal,
  id: definition.id,
  label: definition.label,
  requirement: definition.requirement(definition.goal),
});

export const getTrainerBadges = (stats: TrainerStats): TrainerBadge[] => {
  const questionTypesMastered = Object.values(
    stats.correctQuestionTypes,
  ).filter((correct) => correct > 0).length;
  const generationsMastered = Object.values(stats.correctGenerations).filter(
    (correct) => correct > 0,
  ).length;

  return [
    makeBadge({
      current: stats.masteryRounds,
      goal: 3,
      id: 'perfect-form',
      label: 'Perfect Form',
      requirement: (goal) =>
        `Finish ${goal} perfect Standard or Long Training rounds`,
    }),
    makeBadge({
      current: questionTypesMastered,
      goal: 10,
      id: 'many-paths',
      label: 'Many Paths',
      requirement: (goal) =>
        `Answer correctly in ${goal} different question formats`,
    }),
    makeBadge({
      current: generationsMastered,
      goal: 9,
      id: 'world-tour',
      label: 'World Tour',
      requirement: (goal) =>
        `Answer correctly across all ${goal} Pokémon generations`,
    }),
    makeBadge({
      current: stats.championAnswersWithoutClues,
      goal: 5,
      id: 'champions-instinct',
      label: "Champion's Instinct",
      requirement: (goal) => `Solve ${goal} Champion questions without clues`,
    }),
    makeBadge({
      current: stats.bestDailyStreak,
      goal: 7,
      id: 'daily-resolve',
      label: 'Daily Resolve',
      requirement: (goal) => `Reach a ${goal}-day Daily Combo`,
    }),
  ];
};

export const getEarnedTrainerBadgeCount = (stats: TrainerStats): number =>
  getTrainerBadges(stats).filter(({ earned }) => earned).length;

export const getQualifiedTrainerSpecialties = (
  stats: TrainerStats,
): TrainerSpecialty[] =>
  (Object.keys(trainerSpecialtyLabels) as TrainerSpecialty[]).filter(
    (category) =>
      (stats.categories[category]?.correct ?? 0) >= TRAINER_SPECIALTY_GOAL,
  );

export const getTrainerRank = (stats: TrainerStats): TrainerRank => {
  const earnedBadges = getEarnedTrainerBadgeCount(stats);
  if (earnedBadges === 5) return 'Champion';
  if (earnedBadges >= 3) return 'Ace Trainer';
  if (earnedBadges >= 1) return 'Rising Star';
  return 'Youngster';
};

export const getCardFinish = (rank: TrainerRank): CardFinish => {
  if (rank === 'Champion') return 'Master';
  if (rank === 'Ace Trainer') return 'Aurora';
  if (rank === 'Rising Star') return 'Shimmer';
  return 'Classic';
};

export const getTrainerBadgeChanges = (
  before: TrainerStats,
  after: TrainerStats,
): TrainerBadgeChange[] => {
  const previouslyEarned = new Set(
    getTrainerBadges(before)
      .filter(({ earned }) => earned)
      .map(({ id }) => id),
  );

  return getTrainerBadges(after).flatMap((badge) =>
    badge.earned && !previouslyEarned.has(badge.id)
      ? [{ id: badge.id, label: badge.label }]
      : [],
  );
};
