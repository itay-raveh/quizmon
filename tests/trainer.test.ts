import { catalog } from './fixtures/catalog';
import {
  getCardFinish,
  isLeagueUnlocked,
  trainerSpecialtyDetails,
  type TrainerSpecialty,
  getEarnedTrainerBadgeCount,
  getQualifiedTrainerSpecialties,
  getTrainerTitles,
  getTrainerProgressChanges,
  getTrainerBadges,
  getTrainerRank,
} from '@/game/trainer';
import type { TrainerStats } from '@/game/storage';
import { generations } from '@/game/types';
import { questionTypes } from '@/game/questions/definitions';

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
  );

const masteredGenerations = (count: number) =>
  Object.fromEntries(
    generations.slice(0, count).map((generation) => [generation, 1]),
  );

describe('Trainer Card progression', () => {
  it('awards every distinct League Badge for meaningful accomplishments', () => {
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
      ...oneBadge,
      correctPokemon: Array.from(
        { length: 151 },
        (_, index) => `pokemon-${index}`,
      ),
    });
    const fourBadges = stats({
      ...ace,
      correctCategories: { identity: 50 },
      correctGenerations: masteredGenerations(9),
    });
    const veteran = stats({ ...fourBadges, masteryRounds: 3 });
    const sevenBadges = stats({
      ...veteran,
      bestDailyStreak: 7,
      quickAttackCompleted: true,
    });
    const leagueChallenger = stats({
      ...sevenBadges,
      championAnswersWithoutClues: 5,
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
        tier: 1,
        id: 'world-tour',
        kind: 'badge',
        label: 'World Tour',
      },
      {
        current: 10,
        delta: 2,
        earned: false,
        goal: 50,
        tier: 0,
        id: 'true-calling',
        kind: 'badge',
        label: 'True Calling',
      },
      {
        current: 5,
        delta: 1,
        earned: true,
        goal: 5,
        tier: 2,
        id: 'champions-instinct',
        kind: 'badge',
        label: "Champion's Instinct",
      },
      {
        current: 10,
        delta: 2,
        earned: true,
        goal: 10,
        tier: 1,
        kind: 'specialty',
        label: 'Pokédex Specialist',
        specialty: 'identity',
      },
    ]);
  });

  it('qualifies specialties through correct answers without selecting one', () => {
    const specialtyStats = stats({
      correctCategories: {
        identity: 10,
        type: 9,
      },
    });

    expect(getQualifiedTrainerSpecialties(specialtyStats)).toEqual([
      'identity',
    ]);
    expect(getTrainerTitles(specialtyStats, 'identity')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          current: 10,
          earned: true,
          equipped: true,
          label: 'Pokédex Specialist',
          specialty: 'identity',
        }),
        expect.objectContaining({
          current: 9,
          earned: false,
          equipped: false,
          label: 'Type Specialist',
          specialty: 'type',
        }),
      ]),
    );
  });
});

it.each([
  ['daily-resolve', 'bestDailyStreak', [3, 7, 30]],
  ['champions-instinct', 'championAnswersWithoutClues', [1, 5, 30]],
  ['quick-attack', 'quickAttackRounds', [1, 10, 50]],
  ['perfect-form', 'masteryRounds', [3, 25, 100]],
] as const)(
  'awards %s at each threshold and never early',
  (id, field, goals) => {
    goals.forEach((goal, index) => {
      const badge = (count: number) =>
        getTrainerBadges(stats({ [field]: count })).find(
          (entry) => entry.id === id,
        )!;
      expect(badge(goal - 1).tier).toBe(index);
      expect(badge(goal).tier).toBe(index + 1);
    });
  },
);

it('requires the per-format and per-generation minimum, not a pooled total', () => {
  const progress = stats({
    correctQuestionTypes: Object.fromEntries(
      questionTypes.map((type) => [type, 50]),
    ),
    correctGenerations: Object.fromEntries(
      generations.map((generation) => [generation, 100]),
    ),
  });
  const badge = (id: string) =>
    getTrainerBadges(progress).find((entry) => entry.id === id)!;
  expect(badge('many-paths').tier).toBe(3);
  expect(badge('world-tour').tier).toBe(3);
  progress.correctQuestionTypes[questionTypes[0]!] = 49;
  progress.correctGenerations.IX = 99;
  expect(badge('many-paths').tier).toBe(2);
  expect(badge('world-tour').tier).toBe(2);
  progress.correctQuestionTypes = Object.fromEntries(
    questionTypes.slice(0, 15).map((type) => [type, 10]),
  );
  expect(badge('many-paths').tier).toBe(2);
  progress.correctQuestionTypes[questionTypes[0]!] = 9;
  progress.correctGenerations.IX = 24;
  expect(badge('many-paths').tier).toBe(1);
  expect(badge('world-tour').tier).toBe(1);
});

it('keeps the League gate at all eight bronze badges', () => {
  const bronze = stats({
    bestDailyStreak: 3,
    championAnswersWithoutClues: 1,
    correctCategories: { identity: 50 },
    correctGenerations: masteredGenerations(9),
    correctPokemon: Array.from(
      { length: 151 },
      (_, index) => `pokemon-${index}`,
    ),
    correctQuestionTypes: masteredQuestionTypes(10),
    masteryRounds: 3,
    quickAttackRounds: 1,
  });
  expect(getTrainerBadges(bronze).map(({ tier }) => tier)).toEqual(
    Array(8).fill(1),
  );
  expect(getTrainerRank(bronze)).toBe('League Challenger');
  expect(isLeagueUnlocked(bronze)).toBe(true);
  expect(isLeagueUnlocked({ ...bronze, bestDailyStreak: 2 })).toBe(false);
});

it('requires every real Personal Pokédex entry for gold', () => {
  const names = Object.keys(catalog.pokemon);
  const progress = stats({
    correctPokemon: names.slice(0, 500),
    pokedex: [...names.slice(1), 'unknown', names[1]!],
  });
  const badge = () =>
    getTrainerBadges(progress, catalog).find(
      ({ id }) => id === 'pokedex-trail',
    )!;
  expect(badge()).toMatchObject({
    tier: 2,
    current: names.length - 1,
    goal: names.length,
  });
  progress.pokedex!.push(names[0]!);
  expect(badge().tier).toBe(3);
  const changes = getTrainerProgressChanges(
    { ...progress, pokedex: names.slice(1) },
    progress,
    catalog,
  );
  expect(changes).toContainEqual(
    expect.objectContaining({ id: 'pokedex-trail', tier: 3, earned: true }),
  );
  expect(getTrainerProgressChanges(progress, progress, catalog)).toEqual([]);
});

it('upgrades all titles and keeps counting after gold', () => {
  for (const specialty of Object.keys(
    trainerSpecialtyDetails,
  ) as TrainerSpecialty[]) {
    for (const [index, goal] of [10, 100, 1000].entries()) {
      const before = stats({ correctCategories: { [specialty]: goal - 1 } });
      const after = stats({ correctCategories: { [specialty]: goal } });
      expect(
        getTrainerTitles(before, specialty).find((title) => title.equipped)
          ?.tier,
      ).toBe(index);
      expect(
        getTrainerTitles(after, specialty).find((title) => title.equipped)
          ?.tier,
      ).toBe(index + 1);
      expect(getTrainerProgressChanges(before, after)).toContainEqual(
        expect.objectContaining({
          kind: 'specialty',
          specialty,
          tier: index + 1,
          earned: true,
        }),
      );
    }
  }
  expect(
    getTrainerTitles(stats({ correctCategories: { type: 1200 } }), 'type').find(
      (title) => title.equipped,
    ),
  ).toMatchObject({ tier: 3, current: 1200 });
  const changes = getTrainerProgressChanges(
    stats({ correctCategories: { type: 100 } }),
    stats({ correctCategories: { type: 101 } }),
  );
  expect(changes.find((change) => change.kind === 'specialty')).toMatchObject({
    earned: false,
    current: 101,
    goal: 1000,
    tier: 2,
  });
});
