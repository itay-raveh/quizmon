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
    const stamps = getTrainerStamps(
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
    );

    expect(stamps.filter(({ earned }) => earned).map(({ id }) => id)).toEqual([
      'first-catch',
      'daily-regular',
      'perfect-form',
      'combo-keeper',
      'well-rounded',
    ]);
    expect(stamps.find(({ id }) => id === 'perfect-form')).toMatchObject({
      goal: 3,
      symbol: 'P3',
    });
    expect(stamps.find(({ id }) => id === 'well-rounded')).toMatchObject({
      goal: 3,
      requirement: 'Answer 10 questions in 3 fields',
      symbol: 'K3',
    });
  });

  it('keeps locked stamps visible with progress', () => {
    const stamps = getTrainerStamps(
      stats({ dailyChallengesCompleted: 2, gamesCompleted: 1 }),
    );

    expect(stamps).toHaveLength(5);
    expect(stamps.find(({ id }) => id === 'first-catch')).toMatchObject({
      current: 1,
      earned: true,
    });
    expect(stamps.find(({ id }) => id === 'daily-regular')).toMatchObject({
      current: 2,
      earned: false,
      goal: 7,
    });
  });
});
