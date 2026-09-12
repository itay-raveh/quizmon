import { correctAnswer, result } from '../../../tests/fixtures/result';
import { getHighScoreKey } from '../../domain/quiz/result-ranking';
import type { GameResult } from '../../domain/quiz/types';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { readPlayerData } from './player-storage';
import { dailyTracks } from '../../domain/quiz/daily-track';
import { createBackup, parseBackup } from '../../features/settings/backup';
import {
  canPersistResults,
  readDailyResult,
  readDailyStreak,
  readCompletedDailyCount,
  readTrainerStats,
  saveResult,
} from './results-storage';

describe('saved results', () => {
  beforeEach(() => window.localStorage.clear());

  afterEach(() => vi.useRealTimers());

  it('credits ten independent tracks, but only one shared combo day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
    for (const track of dailyTracks) {
      const mode = { kind: 'daily' as const, date: '2026-09-12', track };
      expect(saveResult(mode, result)).toMatchObject({
        isSaved: true,
        isNewBest: true,
      });
      expect(readDailyResult(mode.date, track)).toEqual({
        ...result,
        dailyTrack: track,
      });
      const progress = readTrainerStats();
      expect(saveResult(mode, { ...result, score: 9999 })).toMatchObject({
        isSaved: true,
        isNewBest: false,
      });
      expect(readTrainerStats()).toEqual(progress);
      expect(readDailyStreak('2026-09-12')).toBe(1);
    }
    expect(Object.keys(readPlayerData().results.daily)).toHaveLength(10);
    expect(readPlayerData().results.streak.creditedDates).toEqual([
      '2026-09-12',
    ]);
    expect(readCompletedDailyCount()).toBe(1);
    expect(
      parseBackup(JSON.stringify(createBackup())).save.data.results,
    ).toEqual(readPlayerData().results);
    vi.setSystemTime(new Date('2026-09-13T12:00:00Z'));
    saveResult(
      { kind: 'daily', date: '2026-09-13', track: dailyTracks[9] },
      result,
    );
    expect(readDailyStreak('2026-09-13')).toBe(2);
  });

  it('preserves a legacy Daily result alongside new tracks', () => {
    const date = '2026-09-12';
    saveResult({ kind: 'daily', date }, result);
    const track = dailyTracks[0]!;
    saveResult({ kind: 'daily', date, track }, { ...result, score: 10 });
    expect(readDailyResult(date)).toEqual(result);
    expect(readDailyResult(date, track)?.score).toBe(10);
    expect(Object.keys(readPlayerData().results.daily)).toHaveLength(2);
  });

  it('keeps legacy bests and compares new results only inside their saved rules', () => {
    const mode = { kind: 'training' } as const;
    saveResult(mode, { ...result, score: 9000 });
    const next: GameResult = {
      ...result,
      rules: {
        version: 1,
        difficulty: 1,
        generations: ['I'],
        formGroups: ['standard'],
        questionTypes: ['pokedex-scan'],
      },
    };
    expect(saveResult(mode, next)).toMatchObject({
      best: next,
      isNewBest: true,
      isSaved: true,
    });
    expect(saveResult(mode, { ...next, score: 100 })).toMatchObject({
      best: next,
      isNewBest: false,
    });
    const harder: GameResult = {
      ...next,
      score: 200,
      rules: { ...next.rules!, difficulty: 5 },
    };
    expect(saveResult(mode, harder)).toMatchObject({
      best: harder,
      isNewBest: true,
      isSaved: true,
    });
    expect(readPlayerData().results.training.league?.score).toBe(9000);
    expect(Object.keys(readPlayerData().results.training)).toHaveLength(3);
  });

  it('records a daily result once and restores it', () => {
    const mode = { kind: 'daily', date: '2026-09-01' } as const;
    expect(saveResult(mode, result)).toEqual({
      best: result,
      isNewBest: true,
      isSaved: true,
    });
    expect(readDailyResult(mode.date)).toEqual(result);
  });

  it('never overwrites the first daily attempt', () => {
    const mode = { kind: 'daily', date: '2026-09-01' } as const;
    saveResult(mode, result);
    const progressBeforeRetry = readTrainerStats();
    const perfect = {
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        correct: true,
        points: 1_000,
      })),
      correctCount: 2,
      score: 4_000,
    };

    expect(saveResult(mode, perfect)).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
    expect(readDailyResult(mode.date)).toEqual(result);
    expect(readTrainerStats()).toEqual(progressBeforeRetry);
  });

  it('keeps one Daily best across challenge dates', () => {
    saveResult({ kind: 'daily', date: '2026-09-01' }, result);
    const lower = { ...result, score: 500 };

    expect(saveResult({ kind: 'daily', date: '2026-09-02' }, lower)).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
  });

  it('only credits new results completed on their local challenge date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-03T12:00:00.000Z'));
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {},
        streak: { creditedDates: [], version: 1 },
        training: {},
      }),
    );

    saveResult({ kind: 'daily', date: '2026-09-01' }, result);
    expect(readDailyStreak('2026-09-03')).toBe(0);

    const zeroScore = {
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        correct: false,
        points: 0,
      })),
      correctCount: 0,
      score: 0,
    };
    saveResult({ kind: 'daily', date: '2026-09-03' }, zeroScore);
    expect(readDailyStreak('2026-09-03')).toBe(1);
  });

  it("keeps yesterday's streak active and crosses a year boundary", () => {
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {
          '2025-12-31': result,
          '2026-01-01': result,
        },
        streak: {
          creditedDates: ['2025-12-31', '2026-01-01'],
          version: 1,
        },
        training: {},
      }),
    );

    expect(readDailyStreak('2026-01-02')).toBe(2);
    expect(readDailyStreak('2026-01-03')).toBe(0);
  });

  it('keeps one League Training best across knowledge configurations', () => {
    const mode = { kind: 'training' } as const;
    saveResult(mode, result, defaultGameSettings);
    const lower = {
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        correct: false,
        points: 0,
      })),
      correctCount: 0,
      score: 0,
    };

    expect(saveResult(mode, lower, defaultGameSettings)).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
    expect(
      saveResult(mode, lower, {
        ...defaultGameSettings,
        generations: ['I'],
      }),
    ).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
    const longer: GameResult = {
      ...result,
      answers: [
        ...result.answers,
        {
          category: 'type',
          cluesUsed: 0,
          correct: true,
          generation: 'III',
          pokemonName: 'rayquaza',
          points: 1_000,
          questionType: 'type-check',
        },
      ],
      correctCount: 2,
      questionCount: 3,
    };
    expect(saveResult(mode, longer, defaultGameSettings).isNewBest).toBe(false);
  });

  it.each([
    [{ kind: 'daily', date: '2026-09-05' }, 'league', 'daily'],
    [{ kind: 'training' }, 'league', 'league'],
    [{ kind: 'training' }, 'custom', 'custom'],
    [{ kind: 'league' }, 'league', null],
  ] as const)(
    '%j with %s settings uses the %s high-score key',
    (mode, trainingMode, expected) => {
      expect(getHighScoreKey(mode, { trainingMode })).toBe(expected);
    },
  );

  it('keeps League and Custom Training bests separate', () => {
    saveResult({ kind: 'training' }, result, defaultGameSettings);
    const customResult = { ...result, score: 500 };

    expect(
      saveResult({ kind: 'training' }, customResult, {
        ...defaultGameSettings,
        trainingMode: 'custom',
      }),
    ).toEqual({
      best: customResult,
      isNewBest: true,
      isSaved: true,
    });
  });

  it('builds Trainer progression from correct answers', () => {
    const perfect = {
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        correct: true,
        points: 1_000,
      })),
      correctCount: result.questionCount,
    };

    saveResult({ kind: 'training' }, perfect, defaultGameSettings);

    expect(readTrainerStats()).toMatchObject({
      correctCategories: {
        identity: 1,
        stat: 1,
      },
      correctPokemon: ['pikachu', 'sudowoodo'],
      masteryRounds: 0,
      quickAttackCompleted: false,
    });
  });

  it('tracks League mastery without rewarding perfect Quick rounds', () => {
    const perfectAnswers: GameResult['answers'] = Array.from(
      { length: 10 },
      (_, index) => ({
        ...correctAnswer,
        category: index === 9 ? 'champion' : 'identity',
        generation: index % 2 === 0 ? 'I' : 'II',
        pokemonName: `pokemon-${index}`,
        questionType: index === 9 ? 'champion' : 'pokedex-scan',
      }),
    );
    const standard = {
      ...result,
      answers: perfectAnswers,
      correctCount: 10,
      questionCount: 10,
    };
    const quick = {
      ...standard,
      answers: perfectAnswers.slice(0, 5),
      correctCount: 5,
      questionCount: 5,
    };

    saveResult({ kind: 'training' }, quick, defaultGameSettings);
    expect(readTrainerStats().masteryRounds).toBe(0);

    saveResult({ kind: 'training' }, standard, defaultGameSettings);
    expect(readTrainerStats()).toMatchObject({
      championAnswersWithoutClues: 1,
      correctGenerations: { I: 8, II: 7 },
      correctPokemon: perfectAnswers.map(({ pokemonName }) => pokemonName),
      correctQuestionTypes: { 'pokedex-scan': 14 },
      masteryRounds: 1,
      quickAttackCompleted: true,
    });
  });

  it('keeps knowledge progress but pauses performance badges under custom rules', () => {
    const answers = Array.from({ length: 10 }, (_, index) => ({
      ...correctAnswer,
      pokemonName: `pokemon-${index}`,
    }));
    const perfect = {
      ...result,
      answers,
      correctCount: 10,
      elapsedSeconds: 30,
      questionCount: 10,
    };

    saveResult({ kind: 'training' }, perfect, {
      ...defaultGameSettings,
      questionTypes: ['pokedex-scan'],
      trainingMode: 'custom',
    });

    expect(readTrainerStats()).toMatchObject({
      correctPokemon: answers.map(({ pokemonName }) => pokemonName),
      masteryRounds: 0,
      quickAttackCompleted: false,
    });
  });

  it('requires both speed and accuracy for Quick Attack', () => {
    const answers = Array.from({ length: 10 }, (_, index) => ({
      ...correctAnswer,
      correct: index < 8,
      pokemonName: `pokemon-${index}`,
      points: index < 8 ? 1_000 : 0,
    }));
    const standard = {
      ...result,
      answers,
      correctCount: 8,
      elapsedSeconds: 59,
      questionCount: 10,
    };

    saveResult(
      { kind: 'training' },
      { ...standard, elapsedSeconds: 60 },
      defaultGameSettings,
    );
    expect(readTrainerStats().quickAttackCompleted).toBe(false);

    saveResult(
      { kind: 'training' },
      {
        ...standard,
        answers: answers.map((answer, index) => ({
          ...answer,
          correct: index < 7,
          points: index < 7 ? 1_000 : 0,
        })),
        correctCount: 7,
      },
      defaultGameSettings,
    );
    expect(readTrainerStats().quickAttackCompleted).toBe(false);

    saveResult({ kind: 'training' }, standard, defaultGameSettings);

    expect(readTrainerStats().quickAttackCompleted).toBe(true);
  });

  it('awards League completion only for a perfect clear', () => {
    const answers = Array.from({ length: 15 }, (_, index) => ({
      ...correctAnswer,
      pokemonName: `league-${index}`,
    }));
    const leagueResult = {
      ...result,
      answers,
      correctCount: 15,
      questionCount: 15,
    };

    saveResult(
      { kind: 'league' },
      {
        ...leagueResult,
        answers: [answers[0]!, { ...answers[1]!, correct: false, points: 0 }],
        correctCount: 1,
      },
      defaultGameSettings,
    );
    expect(readTrainerStats().leagueCompleted).toBe(false);

    saveResult(
      { kind: 'league' },
      {
        ...leagueResult,
        answers: answers.slice(0, 14),
        correctCount: 14,
        questionCount: 14,
      },
      defaultGameSettings,
    );
    expect(readTrainerStats().leagueCompleted).toBe(false);

    saveResult({ kind: 'league' }, leagueResult, defaultGameSettings);
    expect(readTrainerStats().leagueCompleted).toBe(true);
  });

  it('reports when browser storage cannot persist a result', () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Storage disabled', 'QuotaExceededError');
      });

    expect(canPersistResults()).toBe(false);
    expect(saveResult({ kind: 'daily', date: '2026-09-01' }, result)).toEqual({
      best: result,
      isNewBest: false,
      isSaved: false,
    });
    setItem.mockRestore();
  });
});

it('counts qualifying Quick Attack rounds without counting Custom or slow rounds', () => {
  window.localStorage.clear();
  const fast = {
    ...result,
    answers: Array.from({ length: 10 }, () => correctAnswer),
    correctCount: 10,
    questionCount: 10,
    elapsedSeconds: 59,
  };
  saveResult({ kind: 'training' }, fast, {
    ...defaultGameSettings,
    trainingMode: 'league',
  });
  saveResult({ kind: 'training' }, fast, {
    ...defaultGameSettings,
    trainingMode: 'league',
  });
  saveResult({ kind: 'training' }, fast, {
    ...defaultGameSettings,
    trainingMode: 'custom',
  });
  saveResult(
    { kind: 'training' },
    { ...fast, elapsedSeconds: 60 },
    { ...defaultGameSettings, trainingMode: 'league' },
  );
  expect(readTrainerStats().quickAttackRounds).toBe(2);
});

it('qualifies equivalent custom Training at Level 1 and rejects a narrowed family configuration', () => {
  localStorage.clear();
  const families = [
    'pokedex-scan',
    'sprite-match',
    'type-check',
    'type-matchup',
  ] as const;
  const round: GameResult = {
    ...result,
    rules: {
      version: 1,
      difficulty: 1,
      generations: ['I'],
      formGroups: ['standard'],
      questionTypes: [...families],
      automaticQuestionTypes: [...families],
    },
    answers: Array.from({ length: 10 }, () => ({ ...correctAnswer })),
    questionCount: 10,
    correctCount: 10,
    elapsedSeconds: 40,
  };
  saveResult({ kind: 'training' }, round, {
    ...defaultGameSettings,
    trainingMode: 'custom',
    questionSelection: 'custom',
  });
  expect(readTrainerStats()).toMatchObject({
    masteryRounds: 1,
    quickAttackRounds: 1,
  });
  saveResult(
    { kind: 'training' },
    { ...round, rules: { ...round.rules!, questionTypes: ['pokedex-scan'] } },
    defaultGameSettings,
  );
  expect(readTrainerStats()).toMatchObject({
    masteryRounds: 1,
    quickAttackRounds: 1,
  });
});

it('credits only an explicitly unassisted new Champion search answer', () => {
  localStorage.clear();
  const champion = {
    ...correctAnswer,
    category: 'champion' as const,
    questionType: 'champion' as const,
  };
  saveResult(
    { kind: 'training' },
    { ...result, answers: [{ ...champion, unassistedSearch: false }] },
  );
  expect(readTrainerStats().championAnswersWithoutClues).toBe(0);
  saveResult(
    { kind: 'training' },
    { ...result, answers: [{ ...champion, unassistedSearch: true }] },
  );
  expect(readTrainerStats().championAnswersWithoutClues).toBe(1);
});
