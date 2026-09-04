import {
  getCardFinish,
  getEarnedTrainerTierCount,
  getTrainerRank,
  getTrainerStampChanges,
  getTrainerStamps,
} from '@/game/trainer';
import type { TrainerStats } from '@/game/storage';
import { generations, type QuestionType } from '@/game/types';
import { questionTypes } from '@/game/questions/registry';

const stats = (overrides: Partial<TrainerStats> = {}): TrainerStats => ({
  bestDailyStreak: 0,
  categories: {},
  championAnswersWithoutClues: 0,
  correctGenerations: {},
  correctQuestionTypes: {},
  dailyChallengesCompleted: 0,
  gamesCompleted: 0,
  masteryRounds: 0,
  perfectRounds: 0,
  specialty: null,
  ...overrides,
});

const masteredQuestionTypes = (count: number) =>
  Object.fromEntries(
    questionTypes.slice(0, count).map((questionType) => [questionType, 1]),
  ) as Partial<Record<QuestionType, number>>;

const masteredGenerations = (count: number) =>
  Object.fromEntries(
    generations.slice(0, count).map((generation) => [generation, 1]),
  ) as TrainerStats['correctGenerations'];

describe('Trainer Card progression', () => {
  it('gives five distinct League stamps three meaningful tiers each', () => {
    const stamps = getTrainerStamps(
      stats({
        bestDailyStreak: 7,
        championAnswersWithoutClues: 5,
        correctGenerations: masteredGenerations(6),
        correctQuestionTypes: masteredQuestionTypes(10),
        masteryRounds: 3,
      }),
    );

    expect(stamps).toHaveLength(5);
    expect(stamps.map(({ id }) => id)).toEqual([
      'perfect-form',
      'many-paths',
      'world-tour',
      'champions-instinct',
      'daily-resolve',
    ]);
    expect(stamps.every(({ tier }) => tier === 2)).toBe(true);
    expect(getEarnedTrainerTierCount(stats())).toBe(0);
  });

  it('derives rank and finish from the combined stamp tiers', () => {
    const researcher = stats({
      championAnswersWithoutClues: 1,
      correctGenerations: masteredGenerations(3),
      masteryRounds: 1,
    });
    const ace = stats({
      bestDailyStreak: 7,
      championAnswersWithoutClues: 5,
      correctGenerations: masteredGenerations(6),
      correctQuestionTypes: masteredQuestionTypes(10),
    });
    const champion = stats({
      bestDailyStreak: 30,
      championAnswersWithoutClues: 15,
      correctGenerations: masteredGenerations(9),
      correctQuestionTypes: masteredQuestionTypes(15),
      masteryRounds: 10,
    });

    expect(getTrainerRank(stats())).toBe('New Trainer');
    expect(getTrainerRank(researcher)).toBe('Researcher');
    expect(getTrainerRank(ace)).toBe('Ace');
    expect(getTrainerRank(champion)).toBe('Champion');
    expect(getCardFinish(getTrainerRank(researcher))).toBe('Shimmer');
    expect(getCardFinish(getTrainerRank(ace))).toBe('Aurora');
    expect(getCardFinish(getTrainerRank(champion))).toBe('Master');
  });

  it('reports every stamp that advances after a round', () => {
    const changes = getTrainerStampChanges(
      stats(),
      stats({
        championAnswersWithoutClues: 1,
        correctGenerations: masteredGenerations(3),
      }),
    );

    expect(changes).toEqual([
      {
        fromTier: 0,
        id: 'world-tour',
        label: 'World Tour',
        tier: 1,
      },
      {
        fromTier: 0,
        id: 'champions-instinct',
        label: "Champion's Instinct",
        tier: 1,
      },
    ]);
  });
});
