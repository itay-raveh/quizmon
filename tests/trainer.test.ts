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
  championAnswersWithoutClues: 0,
  correctCategories: {},
  correctGenerations: {},
  correctPokemon: [],
  correctQuestionTypes: {},
  masteryRounds: 0,
  quickAttackCompleted: false,
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
  it('awards eight distinct League Badges for meaningful accomplishments', () => {
    const badges = getTrainerBadges(
      stats({
        bestDailyStreak: 7,
        correctCategories: { identity: 50 },
        championAnswersWithoutClues: 5,
        correctGenerations: masteredGenerations(9),
        correctPokemon: Array.from(
          { length: 151 },
          (_, index) => `pokemon-${index}`,
        ),
        correctQuestionTypes: masteredQuestionTypes(10),
        masteryRounds: 3,
        quickAttackCompleted: true,
      }),
    );

    expect(badges).toHaveLength(8);
    expect(badges.map(({ id }) => id)).toEqual([
      'many-paths',
      'pokedex-trail',
      'world-tour',
      'true-calling',
      'quick-attack',
      'perfect-form',
      'daily-resolve',
      'champions-instinct',
    ]);
    expect(badges.every(({ earned }) => earned)).toBe(true);
    expect(getEarnedTrainerBadgeCount(stats())).toBe(0);
  });

  it('derives canonical Trainer ranks and card finishes from earned badges', () => {
    const oneBadge = stats({
      correctQuestionTypes: masteredQuestionTypes(10),
    });
    const ace = stats({
      correctPokemon: Array.from(
        { length: 151 },
        (_, index) => `pokemon-${index}`,
      ),
      correctQuestionTypes: masteredQuestionTypes(10),
    });
    const fourBadges = stats({
      correctCategories: { identity: 50 },
      correctGenerations: masteredGenerations(9),
      correctPokemon: Array.from(
        { length: 151 },
        (_, index) => `pokemon-${index}`,
      ),
      correctQuestionTypes: masteredQuestionTypes(10),
    });
    const veteran = stats({
      correctCategories: { identity: 50 },
      correctGenerations: masteredGenerations(9),
      correctPokemon: Array.from(
        { length: 151 },
        (_, index) => `pokemon-${index}`,
      ),
      correctQuestionTypes: masteredQuestionTypes(10),
      masteryRounds: 3,
    });
    const sevenBadges = stats({
      bestDailyStreak: 7,
      correctCategories: { identity: 50 },
      correctGenerations: masteredGenerations(9),
      correctPokemon: Array.from(
        { length: 151 },
        (_, index) => `pokemon-${index}`,
      ),
      correctQuestionTypes: masteredQuestionTypes(10),
      masteryRounds: 3,
      quickAttackCompleted: true,
    });
    const champion = stats({
      bestDailyStreak: 7,
      correctCategories: { identity: 50 },
      championAnswersWithoutClues: 5,
      correctGenerations: masteredGenerations(9),
      correctPokemon: Array.from(
        { length: 151 },
        (_, index) => `pokemon-${index}`,
      ),
      correctQuestionTypes: masteredQuestionTypes(10),
      masteryRounds: 3,
      quickAttackCompleted: true,
    });

    expect(getTrainerRank(stats())).toBe('Youngster');
    expect(getTrainerRank(oneBadge)).toBe('Youngster');
    expect(getTrainerRank(ace)).toBe('Ace');
    expect(getTrainerRank(fourBadges)).toBe('Ace');
    expect(getTrainerRank(veteran)).toBe('Veteran');
    expect(getTrainerRank(sevenBadges)).toBe('Veteran');
    expect(getTrainerRank(champion)).toBe('Champion');
    expect(getCardFinish(getTrainerRank(stats()))).toBe('Classic');
    expect(getCardFinish(getTrainerRank(oneBadge))).toBe('Classic');
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
          correctCategories: {
            identity: 10,
            type: 9,
          },
        }),
      ),
    ).toEqual(['identity']);
  });
});
