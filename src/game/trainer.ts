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
export type TrainerRank = 'Youngster' | 'Ace' | 'Veteran' | 'Champion';
export type CardFinish = 'Classic' | 'Bronze' | 'Silver' | 'Gold';
export type TrainerCardFace = 'front' | 'badges';
export type TrainerBadgeId =
  | 'many-paths'
  | 'pokedex-trail'
  | 'world-tour'
  | 'true-calling'
  | 'quick-attack'
  | 'perfect-form'
  | 'daily-resolve'
  | 'champions-instinct';

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
  requirement: string;
}

const makeBadge = (definition: BadgeDefinition): TrainerBadge => ({
  current: definition.current,
  earned: definition.current >= definition.goal,
  goal: definition.goal,
  id: definition.id,
  label: definition.label,
  requirement: definition.requirement,
});

export const getTrainerBadges = (stats: TrainerStats): TrainerBadge[] => {
  const questionTypesMastered = Object.values(
    stats.correctQuestionTypes,
  ).filter((correct) => correct > 0).length;
  const generationsMastered = Object.values(stats.correctGenerations).filter(
    (correct) => correct > 0,
  ).length;
  const specialtyMastery = Math.max(
    0,
    ...(Object.keys(trainerSpecialtyLabels) as TrainerSpecialty[]).map(
      (category) => stats.correctCategories[category] ?? 0,
    ),
  );

  return [
    makeBadge({
      current: questionTypesMastered,
      goal: 10,
      id: 'many-paths',
      label: 'Many Paths',
      requirement: 'Answer correctly in 10 different question formats',
    }),
    makeBadge({
      current: stats.correctPokemon.length,
      goal: 151,
      id: 'pokedex-trail',
      label: 'Pokédex Trail',
      requirement: 'Answer correctly about 151 different Pokémon',
    }),
    makeBadge({
      current: generationsMastered,
      goal: 9,
      id: 'world-tour',
      label: 'World Tour',
      requirement: 'Answer correctly across all 9 Pokémon generations',
    }),
    makeBadge({
      current: specialtyMastery,
      goal: 50,
      id: 'true-calling',
      label: 'True Calling',
      requirement: 'Answer 50 questions correctly in one Trainer specialty',
    }),
    makeBadge({
      current: Number(stats.quickAttackCompleted),
      goal: 1,
      id: 'quick-attack',
      label: 'Quick Attack',
      requirement:
        'Finish Standard Training in under 60 seconds with at least 8 correct answers',
    }),
    makeBadge({
      current: stats.masteryRounds,
      goal: 3,
      id: 'perfect-form',
      label: 'Perfect Form',
      requirement: 'Finish 3 perfect Standard or Long Training rounds',
    }),
    makeBadge({
      current: stats.bestDailyStreak,
      goal: 7,
      id: 'daily-resolve',
      label: 'Daily Resolve',
      requirement: 'Reach a 7-day Daily Combo',
    }),
    makeBadge({
      current: stats.championAnswersWithoutClues,
      goal: 5,
      id: 'champions-instinct',
      label: "Champion's Instinct",
      requirement: 'Solve 5 Champion questions without clues',
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
      (stats.correctCategories[category] ?? 0) >= TRAINER_SPECIALTY_GOAL,
  );

export const getTrainerRank = (stats: TrainerStats): TrainerRank => {
  const earnedBadges = getEarnedTrainerBadgeCount(stats);
  if (earnedBadges === 8) return 'Champion';
  if (earnedBadges >= 5) return 'Veteran';
  if (earnedBadges >= 2) return 'Ace';
  return 'Youngster';
};

export const getCardFinish = (rank: TrainerRank): CardFinish => {
  if (rank === 'Champion') return 'Gold';
  if (rank === 'Veteran') return 'Silver';
  if (rank === 'Ace') return 'Bronze';
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
