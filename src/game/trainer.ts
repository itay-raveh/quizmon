import type { TrainerStats } from './storage';
import {
  generations,
  type PokemonCatalog,
  type QuestionCategory,
} from './types';
import { questionTypes } from './questions/definitions';

const TRAINER_SPECIALTY_GOALS = [10, 100, 1000] as const;
export type TrainerTier = 0 | 1 | 2 | 3;
export const trainerTierLabels = [
  'Locked',
  'Bronze',
  'Silver',
  'Gold',
] as const;

export interface TrainerMilestone {
  current: number;
  goal: number;
  requirement: string;
}

const getTier = (milestones: readonly TrainerMilestone[]): TrainerTier =>
  milestones.reduce<TrainerTier>(
    (tier, { current, goal }, index) =>
      current >= goal ? ((index + 1) as TrainerTier) : tier,
    0,
  );

const getProgress = (milestones: readonly TrainerMilestone[]) => {
  const tier = getTier(milestones);
  return {
    ...milestones[Math.min(tier, 2)]!,
    tier,
    earned: tier > 0,
    milestones,
  };
};

export const trainerSpecialtyDetails = {
  ability: {
    label: 'Ability Specialist',
    description: 'Know which abilities a Pokémon can have.',
  },
  description: {
    label: 'Field Researcher',
    description: 'Match Pokédex entries to their Pokémon.',
  },
  evolution: {
    label: 'Evolution Specialist',
    description: 'Track how Pokémon types change through evolution.',
  },
  identity: {
    label: 'Pokédex Specialist',
    description:
      'Identify Pokémon from sprites, silhouettes, crops, and colors.',
  },
  matchup: {
    label: 'Battle Strategist',
    description: 'Solve super-effective type and Pokémon matchups.',
  },
  move: {
    label: 'Move Specialist',
    description: 'Know which moves Pokémon learn by leveling up.',
  },
  stat: {
    label: 'Stat Specialist',
    description: 'Compare Pokémon stats to find the highest or lowest.',
  },
  type: {
    label: 'Type Specialist',
    description: 'Recognize Pokémon types and hidden type patterns.',
  },
} as const satisfies Partial<
  Record<QuestionCategory, { label: string; description: string }>
>;

export type TrainerSpecialty = keyof typeof trainerSpecialtyDetails;
const trainerSpecialties = Object.keys(
  trainerSpecialtyDetails,
) as TrainerSpecialty[];

export type TrainerRank =
  'Youngster' | 'Ace' | 'Veteran' | 'League Challenger' | 'Champion';
export type CardFinish = 'Classic' | 'Bronze' | 'Silver' | 'Gold';
export const trainerViewLabels = {
  badges: 'League Badge Case',
  front: 'Trainer Card',
  titles: 'Trainer Titles',
  pokedex: 'Personal Pokédex',
} as const;

export type TrainerView = keyof typeof trainerViewLabels;

interface TrainerBadgeDefinition {
  id: string;
  label: string;
  milestones: (
    stats: TrainerStats,
    catalog?: PokemonCatalog,
  ) => TrainerMilestone[];
}

const countMilestones = (
  current: number,
  goals: readonly number[],
  requirement: (goal: number) => string,
): TrainerMilestone[] =>
  goals.map((goal) => ({ current, goal, requirement: requirement(goal) }));

const trainerBadgeDefinitions = [
  {
    id: 'many-paths',
    label: 'Many Paths',
    milestones: (stats) =>
      (
        [
          [10, 1],
          [15, 10],
          [18, 50],
        ] as const
      ).map(([goal, minimum]) => ({
        current: questionTypes.filter(
          (type) => (stats.correctQuestionTypes[type] ?? 0) >= minimum,
        ).length,
        goal,
        requirement: `Answer ${minimum} question${minimum === 1 ? '' : 's'} correctly in each of ${goal} different formats`,
      })),
  },
  {
    id: 'pokedex-trail',
    label: 'Pokédex Trail',
    milestones: (stats, catalog) => {
      const found = new Set(stats.pokedex ?? stats.correctPokemon);
      const names = catalog ? Object.keys(catalog.pokemon) : [];
      return [
        ...countMilestones(
          stats.correctPokemon.length,
          [151, 500],
          (goal) => `Answer correctly about ${goal} different Pokémon`,
        ),
        {
          current: names.filter((name) => found.has(name)).length,
          goal: names.length || Infinity,
          requirement: 'Complete the entire Personal Pokédex',
        },
      ];
    },
  },
  {
    id: 'world-tour',
    label: 'World Tour',
    milestones: (stats) =>
      [1, 25, 100].map((minimum) => ({
        current: generations.filter(
          (generation) =>
            (stats.correctGenerations[generation] ?? 0) >= minimum,
        ).length,
        goal: generations.length,
        requirement: `Answer ${minimum} question${minimum === 1 ? '' : 's'} correctly in each of all ${generations.length} Pokémon generations`,
      })),
  },
  {
    id: 'true-calling',
    label: 'True Calling',
    milestones: (stats) =>
      countMilestones(
        Math.max(
          0,
          ...trainerSpecialties.map(
            (category) => stats.correctCategories[category] ?? 0,
          ),
        ),
        [50, 250, 1000],
        (goal) => `Answer ${goal} questions correctly in one Trainer specialty`,
      ),
  },
  {
    id: 'quick-attack',
    label: 'Quick Attack',
    milestones: (stats) =>
      countMilestones(
        stats.quickAttackRounds ?? Number(stats.quickAttackCompleted),
        [1, 10, 50],
        (goal) =>
          `Finish ${goal} League Training round${goal === 1 ? '' : 's'} in under 60 seconds each with at least 8 correct answers`,
      ),
  },
  {
    id: 'perfect-form',
    label: 'Perfect Form',
    milestones: (stats) =>
      countMilestones(
        stats.masteryRounds,
        [3, 25, 100],
        (goal) => `Finish ${goal} perfect League Training rounds`,
      ),
  },
  {
    id: 'daily-resolve',
    label: 'Daily Resolve',
    milestones: (stats) =>
      countMilestones(
        stats.bestDailyStreak,
        [3, 7, 30],
        (goal) => `Reach a ${goal}-day Daily Combo`,
      ),
  },
  {
    id: 'champions-instinct',
    label: "Champion's Instinct",
    milestones: (stats) =>
      countMilestones(
        stats.championAnswersWithoutClues,
        [1, 5, 30],
        (goal) =>
          `Solve ${goal} Champion question${goal === 1 ? '' : 's'} without clues`,
      ),
  },
] as const satisfies readonly TrainerBadgeDefinition[];

export type TrainerBadgeId = (typeof trainerBadgeDefinitions)[number]['id'];
const TRAINER_BADGE_COUNT = trainerBadgeDefinitions.length;

export interface TrainerBadge extends TrainerMilestone {
  tier: TrainerTier;
  milestones: readonly TrainerMilestone[];
  earned: boolean;
  id: TrainerBadgeId;
  label: string;
}

export interface TrainerTitle {
  tier: TrainerTier;
  milestones: readonly TrainerMilestone[];
  current: number;
  description: string;
  earned: boolean;
  equipped: boolean;
  goal: number;
  label: string;
  specialty: TrainerSpecialty;
}

interface TrainerBadgeChange extends Omit<
  TrainerBadge,
  'requirement' | 'milestones'
> {
  delta: number;
  kind: 'badge';
}

interface TrainerSpecialtyChange extends Omit<
  TrainerTitle,
  'description' | 'equipped' | 'milestones'
> {
  delta: number;
  kind: 'specialty';
}

export type TrainerProgressChange = TrainerBadgeChange | TrainerSpecialtyChange;

export const getTrainerBadges = (
  stats: TrainerStats,
  catalog?: PokemonCatalog,
): TrainerBadge[] =>
  trainerBadgeDefinitions.map(({ milestones, ...definition }) => ({
    ...definition,
    ...getProgress(milestones(stats, catalog)),
  }));

export const getEarnedTrainerBadgeCount = (stats: TrainerStats): number =>
  getTrainerBadges(stats).filter(({ earned }) => earned).length;

export const isLeagueUnlocked = (stats: TrainerStats): boolean =>
  getEarnedTrainerBadgeCount(stats) === TRAINER_BADGE_COUNT;

export const getQualifiedTrainerSpecialties = (
  stats: TrainerStats,
): TrainerSpecialty[] =>
  trainerSpecialties.filter(
    (category) =>
      (stats.correctCategories[category] ?? 0) >= TRAINER_SPECIALTY_GOALS[0],
  );

export const getTrainerTitles = (
  stats: TrainerStats,
  equipped: TrainerSpecialty | null,
): TrainerTitle[] =>
  trainerSpecialties.map((specialty) => {
    const current = stats.correctCategories[specialty] ?? 0;
    return {
      ...getProgress(
        countMilestones(
          current,
          TRAINER_SPECIALTY_GOALS,
          (goal) =>
            `Answer ${goal.toLocaleString()} questions correctly in this specialty`,
        ),
      ),
      ...trainerSpecialtyDetails[specialty],
      equipped: specialty === equipped,
      specialty,
    };
  });

export const getTrainerRank = (stats: TrainerStats): TrainerRank => {
  if (stats.leagueCompleted) return 'Champion';
  const earnedBadges = getEarnedTrainerBadgeCount(stats);
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
  catalog?: PokemonCatalog,
): TrainerProgressChange[] => {
  const changeFor = (
    previous: readonly TrainerMilestone[],
    next: readonly TrainerMilestone[],
  ) => {
    const previousTier = getTier(previous);
    const tier = getTier(next);
    const index = Math.min(tier > previousTier ? tier - 1 : previousTier, 2);
    const current = Math.min(next[index]!.current, next[index]!.goal);
    const delta =
      current - Math.min(previous[index]!.current, previous[index]!.goal);
    return delta > 0 || tier > previousTier
      ? {
          current,
          delta,
          goal: next[index]!.goal,
          earned: tier > previousTier,
          tier,
        }
      : null;
  };
  const badgeChanges = trainerBadgeDefinitions.flatMap<TrainerBadgeChange>(
    ({ milestones, id, label }) => {
      const change = changeFor(
        milestones(before, catalog),
        milestones(after, catalog),
      );
      return change ? [{ ...change, id, label, kind: 'badge' }] : [];
    },
  );
  const previousTitles = getTrainerTitles(before, null);
  const specialtyChanges = getTrainerTitles(
    after,
    null,
  ).flatMap<TrainerSpecialtyChange>(
    ({ milestones, specialty, label }, index) => {
      const change = changeFor(previousTitles[index]!.milestones, milestones);
      return change ? [{ ...change, specialty, label, kind: 'specialty' }] : [];
    },
  );
  return [...badgeChanges, ...specialtyChanges];
};
