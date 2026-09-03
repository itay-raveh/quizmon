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
  id: string;
  label: string;
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
  const stamps: TrainerStamp[] = [];
  if (stats.gamesCompleted >= 1) {
    stamps.push({ id: 'first-catch', label: 'First Catch', symbol: '01' });
  }
  if (stats.dailyChallengesCompleted >= 7) {
    stamps.push({ id: 'daily-regular', label: 'Daily Regular', symbol: 'D7' });
  }
  if (stats.perfectRounds >= 3) {
    stamps.push({ id: 'perfect-form', label: 'Perfect Form', symbol: '10' });
  }
  if (stats.bestDailyStreak >= 7) {
    stamps.push({ id: 'combo-keeper', label: 'Combo Keeper', symbol: 'C7' });
  }
  if (
    Object.values(stats.categories).filter((progress) => progress.total >= 10)
      .length >= 3
  ) {
    stamps.push({ id: 'well-rounded', label: 'Well Rounded', symbol: 'ALL' });
  }
  return stamps;
};
