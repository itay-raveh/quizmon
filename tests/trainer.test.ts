import {
  getCardFinish,
  getEarnedTrainerBadgeCount,
  getQualifiedTrainerSpecialties,
  getTrainerBadgeChanges,
  getTrainerBadges,
  getTrainerRank,
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
  it('awards five distinct League Badges for meaningful accomplishments', () => {
    const badges = getTrainerBadges(
      stats({
        bestDailyStreak: 7,
        championAnswersWithoutClues: 5,
        correctGenerations: masteredGenerations(9),
        correctQuestionTypes: masteredQuestionTypes(10),
        masteryRounds: 3,
      }),
    );

    expect(badges).toHaveLength(5);
    expect(badges.map(({ id }) => id)).toEqual([
      'perfect-form',
      'many-paths',
      'world-tour',
      'champions-instinct',
      'daily-resolve',
    ]);
    expect(badges.every(({ earned }) => earned)).toBe(true);
    expect(getEarnedTrainerBadgeCount(stats())).toBe(0);
  });

  it('derives canonical Trainer ranks and card finishes from earned badges', () => {
    const ace = stats({ championAnswersWithoutClues: 5 });
    const veteran = stats({
      championAnswersWithoutClues: 5,
      correctGenerations: masteredGenerations(9),
      masteryRounds: 3,
    });
    const champion = stats({
      bestDailyStreak: 7,
      championAnswersWithoutClues: 5,
      correctGenerations: masteredGenerations(9),
      correctQuestionTypes: masteredQuestionTypes(10),
      masteryRounds: 3,
    });

    expect(getTrainerRank(stats())).toBe('Youngster');
    expect(getTrainerRank(ace)).toBe('Ace');
    expect(getTrainerRank(veteran)).toBe('Veteran');
    expect(getTrainerRank(champion)).toBe('Champion');
    expect(getCardFinish(getTrainerRank(stats()))).toBe('Classic');
    expect(getCardFinish(getTrainerRank(ace))).toBe('Bronze');
    expect(getCardFinish(getTrainerRank(veteran))).toBe('Silver');
    expect(getCardFinish(getTrainerRank(champion))).toBe('Gold');
  });

  it('reports every League Badge newly earned after a round', () => {
    const changes = getTrainerBadgeChanges(
      stats(),
      stats({
        championAnswersWithoutClues: 5,
        correctGenerations: masteredGenerations(9),
      }),
    );

    expect(changes).toEqual([
      { id: 'world-tour', label: 'World Tour' },
      { id: 'champions-instinct', label: "Champion's Instinct" },
    ]);
  });

  it('qualifies specialties through correct answers without selecting one', () => {
    expect(
      getQualifiedTrainerSpecialties(
        stats({
          categories: {
            identity: { correct: 10, total: 12 },
            type: { correct: 9, total: 10 },
          },
        }),
      ),
    ).toEqual(['identity']);
  });
});
