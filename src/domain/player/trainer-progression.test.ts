import { catalog } from '../../../tests/fixtures/catalog';
import { generations } from '../pokemon/types';
import {
  questionDefinitions,
  questionTypes,
} from '../quiz/questions/definitions';
import type { TrainerStats } from './progress';
import {
  getCardFinish,
  getEarnedTrainerBadgeCount,
  getTrainerBadges,
  getTrainerProgressChanges,
  getTrainerRank,
  getTrainerTitles,
  isLeagueUnlocked,
  trainerSpecialtyDetails,
  type TrainerSpecialty,
} from './trainer-progression';

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
  quickAttackRounds: 0,
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
        championAnswersWithoutClues: 5,
        correctGenerations: masteredGenerations(9),
        correctPokemon: Array.from(
          { length: 151 },
          (_, index) => `pokemon-${index}`,
        ),
        correctQuestionTypes: {
          ...masteredQuestionTypes(Math.ceil(questionTypes.length / 2)),
          'pokedex-scan': 50,
        },
        masteryRounds: 3,
        quickAttackCompleted: true,
        quickAttackRounds: 1,
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
      correctQuestionTypes: masteredQuestionTypes(
        Math.ceil(questionTypes.length / 2),
      ),
    });
    const ace = {
      ...oneBadge,
      correctPokemon: Array.from(
        { length: 151 },
        (_, index) => `pokemon-${index}`,
      ),
    };
    const fourBadges = {
      ...ace,
      correctQuestionTypes: { ...ace.correctQuestionTypes, 'pokedex-scan': 50 },
      correctGenerations: masteredGenerations(9),
    };
    const veteran = { ...fourBadges, masteryRounds: 3 };
    const sevenBadges = {
      ...veteran,
      bestDailyStreak: 7,
      quickAttackCompleted: true,
      quickAttackRounds: 1,
    };
    const leagueChallenger = {
      ...sevenBadges,
      championAnswersWithoutClues: 5,
    };
    const champion = { ...leagueChallenger, leagueCompleted: true };

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
        correctQuestionTypes: { 'pokedex-scan': 8 },
        correctGenerations: masteredGenerations(8),
      }),
      stats({
        championAnswersWithoutClues: 5,
        correctQuestionTypes: { 'pokedex-scan': 10 },
        correctGenerations: masteredGenerations(9),
      }),
    );

    expect(changes).toEqual([
      {
        current: 9,
        delta: 1,
        earned: true,
        goal: 9,
        previousTier: 0,
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
        previousTier: 0,
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
        previousTier: 1,
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
        previousTier: 0,
        tier: 1,
        kind: 'specialty',
        label: 'Pokédex Specialist',
        specialty: 'identity',
      },
    ]);
  });

  it('marks specialties earned at ten correct answers', () => {
    const specialtyStats = stats({
      correctQuestionTypes: {
        'pokedex-scan': 10,
        'type-check': 9,
      },
    });

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
      questionTypes.map((type) => [type, 30]),
    ),
    correctGenerations: Object.fromEntries(
      generations.map((generation) => [generation, 100]),
    ),
  });
  const badge = (id: string) =>
    getTrainerBadges(progress).find((entry) => entry.id === id)!;
  expect(badge('many-paths').tier).toBe(3);
  expect(badge('world-tour').tier).toBe(3);
  progress.correctQuestionTypes[questionTypes[0]!] = 29;
  progress.correctGenerations.IX = 99;
  expect(badge('many-paths').tier).toBe(2);
  expect(badge('world-tour').tier).toBe(2);
  progress.correctQuestionTypes = Object.fromEntries(
    questionTypes
      .slice(0, Math.ceil((questionTypes.length * 70) / 100))
      .map((type) => [type, 10]),
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
    correctGenerations: masteredGenerations(9),
    correctPokemon: Array.from(
      { length: 151 },
      (_, index) => `pokemon-${index}`,
    ),
    correctQuestionTypes: {
      ...masteredQuestionTypes(Math.ceil(questionTypes.length / 2)),
      'pokedex-scan': 50,
    },
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
    const type = questionTypes.find(
      (type) => questionDefinitions[type].specialty === specialty,
    )!;
    for (const [index, goal] of [10, 100, 1000].entries()) {
      const before = stats({ correctQuestionTypes: { [type]: goal - 1 } });
      const after = stats({ correctQuestionTypes: { [type]: goal } });
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
    getTrainerTitles(
      stats({ correctQuestionTypes: { 'type-check': 1200 } }),
      'type',
    ).find((title) => title.equipped),
  ).toMatchObject({ tier: 3, current: 1200 });
  const changes = getTrainerProgressChanges(
    stats({ correctQuestionTypes: { 'type-check': 100 } }),
    stats({ correctQuestionTypes: { 'type-check': 101 } }),
  );
  expect(changes.find((change) => change.kind === 'specialty')).toMatchObject({
    earned: false,
    current: 101,
    goal: 1000,
    tier: 2,
  });
});

it('reports uncapped gains at and beyond Gold without creating another tier', () => {
  for (const [before, after, earned] of [
    [998, 1004, true],
    [1046, 1050, false],
  ] as const) {
    const changes = getTrainerProgressChanges(
      stats({
        correctQuestionTypes: { 'type-check': before },
        masteryRounds: before,
      }),
      stats({
        correctQuestionTypes: { 'type-check': after },
        masteryRounds: after,
      }),
    );
    expect(changes).toContainEqual(
      expect.objectContaining({
        kind: 'specialty',
        specialty: 'type',
        current: after,
        delta: after - before,
        tier: 3,
        earned,
      }),
    );
    expect(changes).toContainEqual(
      expect.objectContaining({
        kind: 'badge',
        id: 'perfect-form',
        current: after,
        delta: after - before,
        tier: 3,
        earned: false,
      }),
    );
  }
});

it('credits every newly covered format to its specialty and True Calling', () => {
  const progress = stats({
    correctQuestionTypes: {
      'item-identification': 10,
      'medicine-cabinet': 10,
      'held-item-effects': 10,
      'berry-flavors': 10,
      'natural-gift': 10,
      'field-notes': 1,
      'pokedex-categories': 2,
      'weight-comparison': 3,
      'height-comparison': 4,
      'name-that-region': 5,
      'encounter-locations': 6,
    },
  });
  expect(getTrainerTitles(progress, 'item')).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        specialty: 'item',
        current: 50,
        earned: true,
        equipped: true,
      }),
      expect.objectContaining({
        specialty: 'description',
        current: 21,
        earned: true,
      }),
    ]),
  );
  expect(getTrainerBadges(progress)).toContainEqual(
    expect.objectContaining({ id: 'true-calling', current: 50, tier: 1 }),
  );
});

it('recalculates format goals and earned tiers when the catalog grows', () => {
  const allFormats = [...questionTypes];
  const progress = stats({
    correctQuestionTypes: Object.fromEntries(
      questionTypes.slice(0, 11).map((type) => [type, 30]),
    ),
  });
  const badge = () =>
    getTrainerBadges(progress).find(({ id }) => id === 'many-paths')!;
  questionTypes.splice(11);
  try {
    expect(badge().milestones.map(({ goal }) => goal)).toEqual([6, 8, 11]);
    expect(badge().tier).toBe(3);
    questionTypes.push(...allFormats.slice(11, 20));
    expect(badge().milestones.map(({ goal }) => goal)).toEqual([10, 14, 20]);
    expect(badge().tier).toBe(1);
  } finally {
    questionTypes.splice(0, questionTypes.length, ...allFormats);
  }
});
