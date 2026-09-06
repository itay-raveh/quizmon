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

const trainerSpecialtyDescriptions = {
  ability: 'Know which abilities a Pokémon can have.',
  description: 'Match Pokédex entries to their Pokémon.',
  evolution: 'Track how Pokémon types change through evolution.',
  identity: 'Identify Pokémon from sprites, silhouettes, crops, and colors.',
  matchup: 'Solve super-effective type and Pokémon matchups.',
  move: 'Know which moves Pokémon learn by leveling up.',
  stat: 'Compare Pokémon stats to find the highest or lowest.',
  type: 'Recognize Pokémon types and hidden type patterns.',
} as const satisfies Record<keyof typeof trainerSpecialtyLabels, string>;

export type TrainerSpecialty = keyof typeof trainerSpecialtyLabels;
export type TrainerRank =
  'Youngster' | 'Ace' | 'Veteran' | 'League Challenger' | 'Champion';
export type CardFinish = 'Classic' | 'Bronze' | 'Silver' | 'Gold';
export type TrainerView = 'front' | 'badges' | 'titles';

interface TrainerBadgeDefinition {
  getCurrent: (stats: TrainerStats) => number;
  goal: number;
  id: string;
  label: string;
  requirement: string;
}

const trainerBadgeDefinitions = [
  {
    getCurrent: (stats) =>
      Object.values(stats.correctQuestionTypes).filter((correct) => correct > 0)
        .length,
    goal: 10,
    id: 'many-paths',
    label: 'Many Paths',
    requirement: 'Answer correctly in 10 different question formats',
  },
  {
    getCurrent: (stats) => stats.correctPokemon.length,
    goal: 151,
    id: 'pokedex-trail',
    label: 'Pokédex Trail',
    requirement: 'Answer correctly about 151 different Pokémon',
  },
  {
    getCurrent: (stats) =>
      Object.values(stats.correctGenerations).filter((correct) => correct > 0)
        .length,
    goal: 9,
    id: 'world-tour',
    label: 'World Tour',
    requirement: 'Answer correctly across all 9 Pokémon generations',
  },
  {
    getCurrent: (stats) =>
      Math.max(
        0,
        ...(Object.keys(trainerSpecialtyLabels) as TrainerSpecialty[]).map(
          (category) => stats.correctCategories[category] ?? 0,
        ),
      ),
    goal: 50,
    id: 'true-calling',
    label: 'True Calling',
    requirement: 'Answer 50 questions correctly in one Trainer specialty',
  },
  {
    getCurrent: (stats) => Number(stats.quickAttackCompleted),
    goal: 1,
    id: 'quick-attack',
    label: 'Quick Attack',
    requirement:
      'Finish League Training in under 60 seconds with at least 8 correct answers',
  },
  {
    getCurrent: (stats) => stats.masteryRounds,
    goal: 3,
    id: 'perfect-form',
    label: 'Perfect Form',
    requirement: 'Finish 3 perfect League Training rounds',
  },
  {
    getCurrent: (stats) => stats.bestDailyStreak,
    goal: 7,
    id: 'daily-resolve',
    label: 'Daily Resolve',
    requirement: 'Reach a 7-day Daily Combo',
  },
  {
    getCurrent: (stats) => stats.championAnswersWithoutClues,
    goal: 5,
    id: 'champions-instinct',
    label: "Champion's Instinct",
    requirement: 'Solve 5 Champion questions without clues',
  },
] as const satisfies readonly TrainerBadgeDefinition[];

export type TrainerBadgeId = (typeof trainerBadgeDefinitions)[number]['id'];
const TRAINER_BADGE_COUNT = trainerBadgeDefinitions.length;

export interface TrainerBadge {
  current: number;
  earned: boolean;
  goal: number;
  id: TrainerBadgeId;
  label: string;
  requirement: string;
}

export interface TrainerTitle {
  current: number;
  description: string;
  earned: boolean;
  equipped: boolean;
  goal: number;
  label: string;
  specialty: TrainerSpecialty;
}

interface TrainerBadgeChange {
  current: number;
  delta: number;
  earned: boolean;
  goal: number;
  id: TrainerBadgeId;
  kind: 'badge';
  label: string;
}

interface TrainerSpecialtyChange {
  current: number;
  delta: number;
  earned: boolean;
  goal: number;
  kind: 'specialty';
  label: string;
  specialty: TrainerSpecialty;
}

export type TrainerProgressChange = TrainerBadgeChange | TrainerSpecialtyChange;

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
  return trainerBadgeDefinitions.map(({ getCurrent, ...definition }) =>
    makeBadge({ ...definition, current: getCurrent(stats) }),
  );
};

export const getEarnedTrainerBadgeCount = (stats: TrainerStats): number =>
  getTrainerBadges(stats).filter(({ earned }) => earned).length;

export const isLeagueUnlocked = (stats: TrainerStats): boolean =>
  getEarnedTrainerBadgeCount(stats) === TRAINER_BADGE_COUNT;

export const getQualifiedTrainerSpecialties = (
  stats: TrainerStats,
): TrainerSpecialty[] =>
  (Object.keys(trainerSpecialtyLabels) as TrainerSpecialty[]).filter(
    (category) =>
      (stats.correctCategories[category] ?? 0) >= TRAINER_SPECIALTY_GOAL,
  );

export const getTrainerTitles = (
  stats: TrainerStats,
  equipped: TrainerSpecialty | null,
): TrainerTitle[] =>
  (Object.keys(trainerSpecialtyLabels) as TrainerSpecialty[]).map(
    (specialty) => {
      const current = stats.correctCategories[specialty] ?? 0;
      return {
        current,
        description: trainerSpecialtyDescriptions[specialty],
        earned: current >= TRAINER_SPECIALTY_GOAL,
        equipped: specialty === equipped,
        goal: TRAINER_SPECIALTY_GOAL,
        label: trainerSpecialtyLabels[specialty],
        specialty,
      };
    },
  );

export const getTrainerRank = (stats: TrainerStats): TrainerRank => {
  const earnedBadges = getEarnedTrainerBadgeCount(stats);
  if (stats.leagueCompleted) return 'Champion';
  if (earnedBadges === TRAINER_BADGE_COUNT) return 'League Challenger';
  if (earnedBadges >= 5) return 'Veteran';
  if (earnedBadges >= 2) return 'Ace';
  return 'Youngster';
};

export const getCardFinish = (rank: TrainerRank): CardFinish => {
  if (rank === 'Champion' || rank === 'League Challenger') return 'Gold';
  if (rank === 'Veteran') return 'Silver';
  if (rank === 'Ace') return 'Bronze';
  return 'Classic';
};

export const getTrainerProgressChanges = (
  before: TrainerStats,
  after: TrainerStats,
): TrainerProgressChange[] => {
  const previousBadges = new Map(
    getTrainerBadges(before).map((badge) => [badge.id, badge]),
  );
  const badgeChanges = getTrainerBadges(after).flatMap<TrainerBadgeChange>(
    (badge) => {
      const previousBadge = previousBadges.get(badge.id);
      const previous = Math.min(previousBadge?.current ?? 0, badge.goal);
      const current = Math.min(badge.current, badge.goal);
      return current > previous
        ? [
            {
              current,
              delta: current - previous,
              earned: badge.earned && !previousBadge?.earned,
              goal: badge.goal,
              id: badge.id,
              kind: 'badge',
              label: badge.label,
            },
          ]
        : [];
    },
  );
  const specialtyChanges = (
    Object.keys(trainerSpecialtyLabels) as TrainerSpecialty[]
  ).flatMap<TrainerSpecialtyChange>((specialty) => {
    const previous = Math.min(
      before.correctCategories[specialty] ?? 0,
      TRAINER_SPECIALTY_GOAL,
    );
    const current = Math.min(
      after.correctCategories[specialty] ?? 0,
      TRAINER_SPECIALTY_GOAL,
    );
    return current > previous
      ? [
          {
            current,
            delta: current - previous,
            earned: current === TRAINER_SPECIALTY_GOAL,
            goal: TRAINER_SPECIALTY_GOAL,
            kind: 'specialty',
            label: trainerSpecialtyLabels[specialty],
            specialty,
          },
        ]
      : [];
  });

  return [...badgeChanges, ...specialtyChanges];
};
