import {
  getCardFinish,
  getEarnedTrainerBadgeCount,
  getQualifiedTrainerSpecialties,
  getTrainerProgressChanges,
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
  leagueCompleted: false,
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
    const leagueChallenger = stats({
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
    const champion = stats({ ...leagueChallenger, leagueCompleted: true });

    expect(getTrainerRank(stats())).toBe('Youngster');
    expect(getTrainerRank(oneBadge)).toBe('Youngster');
    expect(getTrainerRank(ace)).toBe('Ace');
    expect(getTrainerRank(fourBadges)).toBe('Ace');
    expect(getTrainerRank(veteran)).toBe('Veteran');
    expect(getTrainerRank(sevenBadges)).toBe('Veteran');
    expect(getTrainerRank(leagueChallenger)).toBe('League Challenger');
    expect(getTrainerRank(champion)).toBe('Champion');
    expect(getCardFinish(getTrainerRank(stats()))).toBe('Classic');
    expect(getCardFinish(getTrainerRank(oneBadge))).toBe('Classic');
    expect(getCardFinish(getTrainerRank(ace))).toBe('Bronze');
    expect(getCardFinish(getTrainerRank(veteran))).toBe('Silver');
    expect(getCardFinish(getTrainerRank(leagueChallenger))).toBe('Gold');
    expect(getCardFinish(getTrainerRank(champion))).toBe('Gold');
  });

  it('reports badge and specialty progress, including newly earned rewards', () => {
    const changes = getTrainerProgressChanges(
      stats({
        championAnswersWithoutClues: 4,
        correctCategories: { identity: 8 },
        correctGenerations: masteredGenerations(8),
      }),
      stats({
        championAnswersWithoutClues: 5,
        correctCategories: { identity: 10 },
        correctGenerations: masteredGenerations(9),
      }),
    );

    expect(changes).toEqual([
      {
        current: 9,
        delta: 1,
        earned: true,
        goal: 9,
        id: 'world-tour',
        kind: 'badge',
        label: 'World Tour',
      },
      {
        current: 10,
        delta: 2,
        earned: false,
        goal: 50,
        id: 'true-calling',
        kind: 'badge',
        label: 'True Calling',
      },
      {
        current: 5,
        delta: 1,
        earned: true,
        goal: 5,
        id: 'champions-instinct',
        kind: 'badge',
        label: "Champion's Instinct",
      },
      {
        current: 10,
        delta: 2,
        earned: true,
        goal: 10,
        kind: 'specialty',
        label: 'Pokédex Specialist',
        specialty: 'identity',
      },
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
