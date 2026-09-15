import { buildDailyForTest } from '../../../tests/fixtures/daily';
import v4 from '../../../tests/fixtures/player-save.v4.json';
import v5 from '../../../tests/fixtures/player-save.v5.json';
import { parsePlayerSave } from '../../domain/player/player-save';
import { getRulesScoreKey } from '../../domain/quiz/round-rules';
import { parseBackup } from '../../features/settings/backup';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { PLAYER_STORAGE_KEY, readPlayerSave } from './player-storage';

it.each([v4, v5])(
  'migrates schema $version through to 7 and round-trips its progress',
  (fixture) => {
    const original = JSON.stringify(fixture);
    localStorage.setItem(PLAYER_STORAGE_KEY, original);
    const saved = readPlayerSave();
    expect(saved.version).toBe(7);
    expect(saved.data.results.training['score:2']).toEqual(
      v5.data.results.training.league,
    );
    expect(saved.data.results.daily).toEqual(v5.data.results.daily);
    expect(saved.data.results.progress).toMatchObject({
      correctPokemon: ['pikachu'],
      quickAttackRounds: 1,
    });
    expect(saved.data.profile?.name).toBe('Leaf');
    expect(saved.data.pokedex).toEqual(['pikachu']);
    expect(parsePlayerSave(saved)).toEqual(saved);
    expect(JSON.stringify(fixture)).toBe(original);
    expect(JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY)!)).toEqual(
      saved,
    );
    expect(
      parseBackup(
        JSON.stringify({
          format: 'quizmon-backup',
          version: 1,
          exportedAt: '2026-09-01T00:00:00.000Z',
          save: fixture,
        }),
      ).save,
    ).toEqual(saved);
  },
);

it('combines Training records by scoring revision and breaks tied scores by precise duration', () => {
  const result = v5.data.results.training.league;
  const rules = {
    version: 14,
    difficulty: 3 as const,
    generations: ['I' as const],
    formGroups: ['standard' as const],
    questionTypes: ['pokedex-scan' as const],
  };
  const fast = { ...result, rules, elapsedMilliseconds: 19999 };
  const unversioned = { ...result, scoreVersion: undefined, score: 99999 };
  const old = structuredClone(v5);
  const training = {
    league: result,
    custom: unversioned,
    [getRulesScoreKey(fast)!]: fast,
  };
  const saved = parsePlayerSave({
    ...old,
    data: { ...old.data, results: { ...old.data.results, training } },
  });
  expect(saved.data.results.training).toEqual({
    'score:0': { ...unversioned, scoreVersion: 0 },
    'score:2': fast,
  });
});

it.each([4, 5])(
  'preserves all original schema %i bytes when even a losing record is malformed',
  (version) => {
    const fixture = version === 4 ? v4 : v5;
    const old = structuredClone(fixture);
    const training = {
      ...old.data.results.training,
      custom: { ...old.data.results.training.league, score: -1 },
    };
    const raw = JSON.stringify(
      {
        ...old,
        data: { ...old.data, results: { ...old.data.results, training } },
      },
      null,
      3,
    );
    localStorage.setItem(PLAYER_STORAGE_KEY, raw);
    expect(() => readPlayerSave()).toThrow(
      expect.objectContaining({ kind: 'invalid' }),
    );
    expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(raw);
  },
);

it('retains retired answers and counts while migrating old settings defaults', () => {
  const old = structuredClone(v5);
  const retired = {
    ...old.data.results.training.league,
    answers: [
      {
        category: 'cry',
        questionType: 'baby-pokemon',
        correct: true,
        points: 1000,
      },
    ],
  };
  const saved = parsePlayerSave({
    ...old,
    data: {
      ...old.data,
      leagueLineup: { seed: 'saved-seed', contentVersion: 0, questions: [] },
      settings: {
        ...defaultGameSettings,
        difficulty: undefined,
        questionSelection: undefined,
        formGroups: undefined,
        questionTypes: ['baby-pokemon', 'pokedex-scan'],
      },
      results: {
        ...old.data.results,
        training: { league: retired },
        progress: {
          ...old.data.results.progress,
          correctQuestionTypes: { 'baby-pokemon': 3 },
        },
      },
    },
  });
  expect(saved.data.results.training['score:2']).toEqual(retired);
  expect(saved.data.results.progress.correctQuestionTypes).toEqual({
    'baby-pokemon': 3,
  });
  expect(saved.data.settings).toEqual({
    ...defaultGameSettings,
    questionTypes: ['pokedex-scan'],
  });
  expect(saved.data.leagueLineup?.seed).toBe('saved-seed');
  expect(parsePlayerSave(saved)).toEqual(saved);
});

it('translates schema 4 answers throughout Hall of Fame records', () => {
  const old = structuredClone(v4);
  const result = {
    ...old.data.results.training.league,
    questionCount: 15,
    correctCount: 15,
    answers: Array.from(
      { length: 15 },
      () => old.data.results.training.league.answers[0]!,
    ),
  };
  const hallOfFame = [
    {
      id: 'victory-1',
      completedAt: '2026-09-01T00:00:00.000Z',
      trainerName: 'Leaf',
      pokemon: ['pikachu'],
      result,
    },
  ];
  const saved = parsePlayerSave({ ...old, data: { ...old.data, hallOfFame } });
  expect(saved.data.hallOfFame[0]?.result.answers[0]).toEqual(
    v5.data.results.training.league.answers[0],
  );
});

it('retains full League lineups including retired question records', () => {
  const question = buildDailyForTest('2026-09-15')[0]!;
  const leagueLineup = {
    seed: 'retained-lineup',
    contentVersion: 13,
    questions: Array.from({ length: 15 }, () => ({
      ...question,
      questionType: 'baby-pokemon',
    })),
  };
  const saved = parsePlayerSave({ ...v5, data: { ...v5.data, leagueLineup } });
  expect(saved.data.leagueLineup).toEqual(leagueLineup);
  expect(parsePlayerSave(saved)).toEqual(saved);
});
