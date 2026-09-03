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

export interface TrainerStamp {
  current: number;
  earned: boolean;
  goal: number;
  id: string;
  label: string;
  requirement: string;
  symbol: string;
}

export const getTrainerRank = (stats: TrainerStats): TrainerRank => {
  if (
    stats.gamesCompleted >= 100 &&
    stats.dailyChallengesCompleted >= 30 &&
    stats.perfectRounds >= 10 &&
    stats.bestDailyStreak >= 7
  ) {
    return 'Champion';
  }
  if (stats.gamesCompleted >= 25 && stats.perfectRounds >= 2) return 'Ace';
  if (stats.gamesCompleted >= 5 || stats.dailyChallengesCompleted >= 3) {
    return 'Researcher';
  }
  return 'New Trainer';
};

export const getCardFinish = (rank: TrainerRank): CardFinish => {
  if (rank === 'Champion') return 'Master';
  if (rank === 'Ace') return 'Aurora';
  if (rank === 'Researcher') return 'Shimmer';
  return 'Classic';
};

export const getTrainerStamps = (stats: TrainerStats): TrainerStamp[] => {
  const studiedFields = Object.values(stats.categories).filter(
    (progress) => progress.total >= 10,
  ).length;

  return [
    {
      current: stats.gamesCompleted,
      earned: stats.gamesCompleted >= 1,
      goal: 1,
      id: 'first-catch',
      label: 'First Catch',
      requirement: 'Complete 1 game',
      symbol: '01',
    },
    {
      current: stats.dailyChallengesCompleted,
      earned: stats.dailyChallengesCompleted >= 7,
      goal: 7,
      id: 'daily-regular',
      label: 'Daily Regular',
      requirement: 'Clear 7 Daily Challenges',
      symbol: 'D7',
    },
    {
      current: stats.perfectRounds,
      earned: stats.perfectRounds >= 3,
      goal: 3,
      id: 'perfect-form',
      label: 'Perfect Form',
      requirement: 'Finish 3 perfect rounds',
      symbol: 'P3',
    },
    {
      current: stats.bestDailyStreak,
      earned: stats.bestDailyStreak >= 7,
      goal: 7,
      id: 'combo-keeper',
      label: 'Combo Keeper',
      requirement: 'Reach a 7-day Daily Combo',
      symbol: 'C7',
    },
    {
      current: studiedFields,
      earned: studiedFields >= 3,
      goal: 3,
      id: 'well-rounded',
      label: 'Well Rounded',
      requirement: 'Answer 10 questions in 3 fields',
      symbol: 'K3',
    },
  ];
};
