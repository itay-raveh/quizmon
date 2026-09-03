import {
  getCardFinish,
  getTrainerRank,
  getTrainerStamps,
} from '@/game/trainer';
import type { TrainerStats } from '@/game/storage';

const stats = (overrides: Partial<TrainerStats> = {}): TrainerStats => ({
  bestDailyStreak: 0,
  categories: {},
  dailyChallengesCompleted: 0,
  gamesCompleted: 0,
  perfectRounds: 0,
  specialty: null,
  ...overrides,
});

describe('Trainer Card progression', () => {
  it('uses milestones from different kinds of play for upper ranks', () => {
    expect(getTrainerRank(stats())).toBe('New Trainer');
    expect(getTrainerRank(stats({ gamesCompleted: 5 }))).toBe('Researcher');
    expect(
      getTrainerRank(stats({ gamesCompleted: 25, perfectRounds: 2 })),
    ).toBe('Ace');
    expect(
      getTrainerRank(
        stats({
          bestDailyStreak: 7,
          dailyChallengesCompleted: 30,
          gamesCompleted: 100,
          perfectRounds: 10,
        }),
      ),
    ).toBe('Champion');
  });

  it('ties each card finish to its earned rank', () => {
    expect(getCardFinish('New Trainer')).toBe('Classic');
    expect(getCardFinish('Researcher')).toBe('Shimmer');
    expect(getCardFinish('Ace')).toBe('Aurora');
    expect(getCardFinish('Champion')).toBe('Master');
  });

  it('awards stamps for varied accomplishments', () => {
    expect(
      getTrainerStamps(
        stats({
          bestDailyStreak: 7,
          categories: {
            identity: { correct: 8, total: 10 },
            move: { correct: 7, total: 10 },
            type: { correct: 9, total: 10 },
          },
          dailyChallengesCompleted: 7,
          gamesCompleted: 12,
          perfectRounds: 3,
        }),
      ).map(({ id }) => id),
    ).toEqual([
      'first-catch',
      'daily-regular',
      'perfect-form',
      'combo-keeper',
      'well-rounded',
    ]);
  });
});
