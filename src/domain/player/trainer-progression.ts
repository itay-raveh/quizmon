import { generations, type PokemonCatalog } from '../pokemon/types.ts';
import {
  questionDefinitions,
  questionTypes,
} from '../quiz/questions/definitions.ts';
import type { QuestionType } from '../quiz/types.ts';
import type { TrainerStats } from './progress.ts';

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
  (milestones.findLastIndex(({ current, goal }) => current >= goal) +
    1) as TrainerTier;

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
    description: 'Know Pokémon abilities, Hidden Abilities, and their effects.',
  },
  berry: {
    label: 'Berry Specialist',
    description: 'Know berry flavors and the types they give Natural Gift.',
  },
  description: {
    label: 'Field Researcher',
    description: 'Know Pokédex entries, Pokémon sizes, regions, and habitats.',
  },
  evolution: {
    label: 'Evolution Specialist',
    description: 'Know evolution chains, items, conditions, and type changes.',
  },
  identity: {
    label: 'Pokédex Specialist',
    description:
      'Recognize Pokémon, their generations, and Legendary or Mythical status.',
  },
  item: {
    label: 'Item Specialist',
    description: 'Know items, medicine, and held effects.',
  },
  matchup: {
    label: 'Battle Strategist',
    description: 'Solve super-effective type and Pokémon matchups.',
  },
  move: {
    label: 'Move Specialist',
    description: 'Know move types, damage classes, and level-up learnsets.',
  },
  stat: {
    label: 'Stat Specialist',
    description: 'Compare Pokémon stats and understand natures and EV yields.',
  },
  type: {
    label: 'Type Specialist',
    description: 'Recognize Pokémon types and hidden type patterns.',
  },
} as const;

export type TrainerSpecialty = keyof typeof trainerSpecialtyDetails;
const trainerSpecialties = Object.keys(
  trainerSpecialtyDetails,
) as TrainerSpecialty[];

export const getTrainerSpecialtyCount = (
  correctQuestionTypes: Partial<Record<QuestionType, number>>,
  specialty: TrainerSpecialty,
): number =>
  questionTypes.reduce(
    (total, type) =>
      total +
      (questionDefinitions[type].specialty === specialty
        ? (correctQuestionTypes[type] ?? 0)
        : 0),
    0,
  );

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
          [50, 1],
          [70, 10],
          [100, 30],
        ] as const
      ).map(([percentage, minimum]) => {
        const goal = Math.ceil((questionTypes.length * percentage) / 100);
        return {
          current: questionTypes.filter(
            (type) => (stats.correctQuestionTypes[type] ?? 0) >= minimum,
          ).length,
          goal,
          requirement: `Answer ${minimum} question${minimum === 1 ? '' : 's'} correctly in each of ${goal} formats (${percentage}% of all formats)`,
        };
      }),
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
          ...trainerSpecialties.map((specialty) =>
            getTrainerSpecialtyCount(stats.correctQuestionTypes, specialty),
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
        stats.quickAttackRounds,
        [1, 10, 50],
        (goal) =>
          `Finish ${goal} ten-question Training round${goal === 1 ? '' : 's'} in under 60 seconds each with at least 8 correct answers, using automatic questions or an equivalent custom selection`,
      ),
  },
  {
    id: 'perfect-form',
    label: 'Perfect Form',
    milestones: (stats) =>
      countMilestones(
        stats.masteryRounds,
        [3, 25, 100],
        (goal) =>
          `Finish ${goal} perfect ten-question Training rounds using automatic questions or an equivalent custom selection`,
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
          `Solve ${goal} Champion question${goal === 1 ? '' : 's'} using description-only search without assistance`,
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
  previousTier: TrainerTier;
  kind: 'badge';
}

interface TrainerSpecialtyChange extends Omit<
  TrainerTitle,
  'description' | 'equipped' | 'milestones'
> {
  delta: number;
  previousTier: TrainerTier;
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
  getTrainerBadges(stats).every(({ earned }) => earned);

export const getTrainerTitles = (
  stats: TrainerStats,
  equipped: TrainerSpecialty | null,
): TrainerTitle[] =>
  trainerSpecialties.map((specialty) => {
    const current = getTrainerSpecialtyCount(
      stats.correctQuestionTypes,
      specialty,
    );
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
    const earned = tier > previousTier;
    const index = Math.min(earned ? tier - 1 : previousTier, 2);
    const current = next[index]!.current;
    const delta = current - previous[index]!.current;
    return delta > 0 || earned
      ? {
          current,
          delta,
          previousTier,
          goal: next[index]!.goal,
          earned,
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
