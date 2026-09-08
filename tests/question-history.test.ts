import { buildDailyQuestions, buildQuestions } from '@/game/game';
import { defaultModifiers } from '@/game/modifiers';
import { createSeededRandom } from '@/game/random';
import {
  emptyQuestionHistory,
  getQuestionKey,
  getQuestionRecency,
  getSubjectRecency,
  getQuestionExposure,
  rememberQuestion,
  rememberShownQuestion,
  isQuestionHistory,
} from '@/game/question-history';
import {
  getLeagueLineup,
  registerShownQuestion,
} from '@/game/question-history-storage';
import { readPlayerSave, updatePlayerData } from '@/game/player-storage';
import { createBackup, parseBackup, restoreBackup } from '@/game/backup';
import { readActiveGame, writeActiveGame } from '@/game/active-game';
import {
  optionSetRepetition,
  targetRepetition,
} from '@/game/questions/repetition';
import { isQuestionData, isQuestionLineup } from '@/game/question-lineup';
import { questionTypes } from '@/game/questions/definitions';
import type { Generation, QuestionType } from '@/game/types';
import { catalog } from './fixtures/catalog';
import type { QuestionBuilder, QuestionDraft } from '@/game/questions/shared';

const genFive: Generation[] = ['I', 'II', 'III', 'IV', 'V'];
const generate = (
  type: QuestionType,
  history = emptyQuestionHistory(),
  seed = 'history-test',
  count = 1,
  generations = genFive,
) =>
  buildQuestions(
    catalog,
    { ...defaultModifiers, questionTypes: [type], generations },
    createSeededRandom(seed),
    count,
    history,
  );

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

it('covers all 40 eligible Evolution Shift targets across games before recycling the oldest', () => {
  let history = emptyQuestionHistory();
  const seen: string[] = [];
  for (let game = 0; game < 4; game++) {
    const questions = generate('evolution-shift', history, `shift:${game}`, 10);
    expect(questions).toHaveLength(10);
    for (const question of questions) {
      expect(seen).not.toContain(question.pokemonName);
      seen.push(question.pokemonName);
      history = rememberQuestion(history, question);
    }
  }
  expect(seen).toHaveLength(40);
  expect(generate('evolution-shift', history)[0]!.pokemonName).toBe(seen[0]);
});

it('retains history when generation selections change', () => {
  const initial = generate(
    'evolution-shift',
    emptyQuestionHistory(),
    'first',
    10,
  );
  const history = initial.reduce(rememberQuestion, emptyQuestionHistory());
  const expanded = generate(
    'evolution-shift',
    history,
    'expanded',
    10,
    defaultModifiers.generations,
  );
  const combined = expanded.reduce(rememberQuestion, history);
  const restricted = generate('evolution-shift', combined, 'restricted', 10);
  expect(
    new Set([...initial, ...expanded, ...restricted].map(getQuestionKey)).size,
  ).toBe(30);
});

it('counts only displayed questions and makes duplicate exposure notifications harmless', async () => {
  const questions = generate(
    'evolution-shift',
    emptyQuestionHistory(),
    'abandoned',
    10,
  );
  await registerShownQuestion(questions[0]!, 'round', 0, null);
  await registerShownQuestion(questions[0]!, 'round', 0, null);
  const history = readPlayerSave().data.questionHistory;
  expect(history.sequence).toBe(1);
  expect(Object.keys(history.questions)).toEqual([
    getQuestionKey(questions[0]!),
  ]);
  const next = generate('evolution-shift', history, 'after-abandon', 39);
  expect(next.some((q) => q.pokemonName === questions[0]!.pokemonName)).toBe(
    false,
  );
  expect(new Set(next.map(getQuestionKey)).size).toBe(39);
});

it('tracks all correct Pokémon in Legend Hunt and covers the restricted pool', () => {
  let history = emptyQuestionHistory();
  const seen = new Set<string>();
  for (let i = 0; i < 24; i++) {
    const question = generate('legend-hunt', history, `legends:${i}`)[0]!;
    const fresh = question.answer.correctOptions.filter(
      (name) => !seen.has(name),
    );
    expect(fresh.length).toBe(
      Math.min(48 - seen.size, question.answer.correctOptions.length),
    );
    for (const name of question.answer.correctOptions) seen.add(name);
    history = rememberQuestion(history, question);
    expect(
      question.answer.correctOptions.every(
        (name) => history.subjects[`legend-hunt:${name}`] === history.sequence,
      ),
    ).toBe(true);
  }
  expect(seen.size).toBe(48);
});

it('does not confuse button order or sprite crops with a new question', () => {
  const question = generate('pixel-peek')[0]!;
  const changed = {
    ...question,
    id: 'another-id',
    options: [...question.options].reverse(),
    media: {
      kind: 'pixel-peek' as const,
      src: 'another-sprite',
      focusX: 25,
      focusY: 75,
    },
  };
  expect(getQuestionKey(changed)).toBe(getQuestionKey(question));
  const group = generate('legend-hunt')[0]!;
  const reordered = {
    ...group,
    pokemonName: group.answer.correctOptions[1]!,
    options: [...group.options].reverse(),
  };
  reordered.repetition = optionSetRepetition({ subjects: 'correct' })(
    reordered,
  );
  expect(getQuestionKey(reordered)).toBe(getQuestionKey(group));
});

it('distinguishes stat and matchup questions while keeping related Pokémon exposure', () => {
  const stat = generate('stat-showdown')[0]!;
  if (stat.visual?.kind !== 'stat-showdown')
    throw new Error('Expected stat question');
  expect(
    getQuestionKey({
      ...stat,
      repetition: optionSetRepetition({
        subjects: 'all',
        variant: [
          stat.visual.stat,
          stat.visual.direction === 'highest' ? 'lowest' : 'highest',
        ],
      })(stat),
    }),
  ).not.toBe(getQuestionKey(stat));
  const matchup = generate('type-matchup')[0]!;
  expect(
    getQuestionKey({
      ...matchup,
      repetition: targetRepetition({ pokemonOptions: false, variant: ['999'] })(
        matchup,
      ),
    }),
  ).not.toBe(getQuestionKey(matchup));
  const exposure = getQuestionExposure(generate('evolution-link')[0]!);
  expect(exposure.primary).toHaveLength(3);
  expect(exposure.distractors).toHaveLength(3);
});

it('avoids recently featured Pokémon across question formats', () => {
  const question = generate('pokedex-scan')[0]!;
  const history = rememberQuestion(emptyQuestionHistory(), question);
  const next = generate('silhouette-match', history, 'different-format')[0]!;
  expect(getQuestionExposure(next).primary).not.toContain(question.pokemonName);
});

it.each(questionTypes)(
  'generates valid %s questions across repeated games',
  (type) => {
    let history = emptyQuestionHistory();
    const keys = new Set<string>();
    for (let game = 0; game < 3; game++) {
      const questions = generate(type, history, `${type}:${game}`, 5);
      expect(questions).toHaveLength(5);
      for (const question of questions) {
        expect(question.questionType).toBe(type);
        expect(isQuestionData(question)).toBe(true);
        expect(keys.has(getQuestionKey(question))).toBe(false);
        keys.add(getQuestionKey(question));
        history = rememberQuestion(history, question);
      }
    }
  },
  15000,
);

it('round-trips history and frozen lineups through saves and backup restore', async () => {
  const questions = generate(
    'evolution-shift',
    emptyQuestionHistory(),
    'saved',
    10,
  );
  await registerShownQuestion(questions[0]!, 'saved-run', 0, null);
  const league = getLeagueLineup(catalog, 'league-history', defaultModifiers);
  const backup = parseBackup(JSON.stringify(createBackup()));
  localStorage.clear();
  restoreBackup(backup);
  expect(readPlayerSave().data.questionHistory.sequence).toBe(1);
  expect(getLeagueLineup(catalog, 'league-history', defaultModifiers)).toEqual(
    league,
  );
  expect(await registerShownQuestion(questions[1]!, 'stale-tab', 1, null)).toBe(
    false,
  );
  writeActiveGame({
    answers: [],
    questions,
    roundId: 'saved-run',
    contentVersion: catalog.contentVersion,
    elapsedMilliseconds: 0,
    mode: { kind: 'training' },
    modifiers: defaultModifiers,
    questionCount: questions.length,
    seed: 'saved',
  });
  updatePlayerData({
    questionHistory: questions.reduce(rememberQuestion, emptyQuestionHistory()),
  });
  expect(readActiveGame()?.questions).toEqual(questions);
  expect(readActiveGame()?.version).toBe(2);
});

it('preserves failed League retries after other games and gives a new run fresh content', () => {
  const original = getLeagueLineup(catalog, 'retry-seed', defaultModifiers);
  updatePlayerData({
    questionHistory: original.reduce(rememberQuestion, emptyQuestionHistory()),
  });
  expect(getLeagueLineup(catalog, 'retry-seed', defaultModifiers)).toEqual(
    original,
  );
  expect(getLeagueLineup(catalog, 'new-seed', defaultModifiers)).not.toEqual(
    original,
  );
});

it('keeps Daily independent of personal history and rotates Champion targets across dates', () => {
  const first = buildDailyQuestions(catalog, '2026-09-08');
  updatePlayerData({
    questionHistory: first.reduce(rememberQuestion, emptyQuestionHistory()),
  });
  expect(buildDailyQuestions(catalog, '2026-09-08')).toEqual(first);
  const champions = new Set<string>();
  for (let day = 0; day < 45; day++) {
    const date = new Date(Date.UTC(2026, 8, 1 + day))
      .toISOString()
      .slice(0, 10);
    const questions = buildDailyQuestions(catalog, date);
    expect(questions.every(isQuestionData)).toBe(true);
    champions.add(questions.at(-1)!.pokemonName);
  }
  expect(champions.size).toBe(45);
}, 15000);

it('rejects corrupt history and stops stale exposure events from moving history backwards', () => {
  const question = generate('evolution-shift')[0]!;
  const history = rememberShownQuestion(
    emptyQuestionHistory(),
    question,
    'round',
    3,
  );
  expect(rememberShownQuestion(history, question, 'round', 2)).toBe(history);
  expect(isQuestionHistory({ ...history, sequence: -1 })).toBe(false);
  expect(
    isQuestionHistory({ ...history, questions: { bad: history.sequence + 1 } }),
  ).toBe(false);
  expect(isQuestionHistory({ ...history, subjects: { bad: '1' } })).toBe(false);
});

it('retains the most recent round receipts rather than the rounds with the most answers', () => {
  const question = generate('evolution-shift')[0]!;
  let history = rememberShownQuestion(
    emptyQuestionHistory(),
    question,
    'old-complete',
    9,
  );
  for (let round = 0; round < 128; round++) {
    history = rememberShownQuestion(
      history,
      question,
      `new-abandoned:${round}`,
      0,
    );
  }
  expect(Object.keys(history.rounds)).toHaveLength(128);
  expect(history.rounds['old-complete']).toBeUndefined();
  expect(rememberShownQuestion(history, question, 'new-abandoned:127', 0)).toBe(
    history,
  );
  expect(isQuestionHistory(history)).toBe(true);
});

it('maintains the full small-pool repeat distance over twenty games', () => {
  let history = emptyQuestionHistory();
  const last = new Map<string, number>();
  let position = 0;
  for (let game = 0; game < 20; game++) {
    for (const question of generate(
      'evolution-shift',
      history,
      `long-run:${game}`,
      10,
    )) {
      const previous = last.get(question.pokemonName);
      if (previous !== undefined) expect(position - previous).toBe(40);
      last.set(question.pokemonName, position++);
      history = rememberQuestion(history, question);
    }
  }
  expect(history.sequence).toBe(200);
  expect(last.size).toBe(40);
}, 15000);

it.each(['legend-hunt', 'stat-showdown'] as const)(
  'keeps assembled %s sets varied over 200 questions',
  (type) => {
    let history = emptyQuestionHistory();
    const keys = new Set<string>();
    for (let game = 0; game < 20; game++) {
      for (const question of generate(type, history, `assembled:${game}`, 10)) {
        expect(keys.has(getQuestionKey(question))).toBe(false);
        keys.add(getQuestionKey(question));
        history = rememberQuestion(history, question);
      }
    }
    expect(keys.size).toBe(200);
  },
  30000,
);

it('uses explicit metadata for a future format without knowing its presentation', () => {
  const question = {
    questionType: 'future-format',
    repetition: {
      identity: 'habitat:forest:day',
      subjects: ['forest'],
      primary: ['pikachu', 'eevee'],
      distractors: ['mew'],
    },
  };
  const history = rememberQuestion(emptyQuestionHistory(), question);
  expect(getQuestionRecency(history, question)).toBe(1);
  expect(getSubjectRecency(history, 'future-format', 'forest')).toBe(1);
  expect(history.pokemon).toEqual({ pikachu: 1, eevee: 1 });
  expect(history.distractors).toEqual({ mew: 1 });
  expect(
    getQuestionRecency(history, {
      ...question,
      repetition: { ...question.repetition, identity: 'habitat:forest:night' },
    }),
  ).toBe(0);
  expect(
    getQuestionRecency(history, {
      ...question,
      questionType: 'another-future-format',
    }),
  ).toBe(0);
});

it('requires builders and saved questions to provide repeat metadata', () => {
  const question = generate('pokedex-scan')[0]!;
  const { repetition, ...withoutRepetition } = question;
  const incompleteDraft: Omit<QuestionDraft, 'repetition'> = withoutRepetition;
  // @ts-expect-error A builder without repeat metadata must fail type checking.
  const incompleteBuilder: QuestionBuilder = () => incompleteDraft;
  expect(
    isQuestionData(
      incompleteBuilder({
        catalog,
        pool: [],
        used: new Set(),
        random: () => 0,
      }),
    ),
  ).toBe(false);
  expect(isQuestionData({ ...question, repetition })).toBe(true);
  for (const invalid of [
    null,
    {},
    { ...repetition, identity: '' },
    { ...repetition, subjects: undefined },
    { ...repetition, primary: [null] },
    { ...repetition, distractors: 'pikachu' },
  ]) {
    expect(isQuestionData({ ...question, repetition: invalid })).toBe(false);
  }
});

it('does not tie persisted history or lineups to the current catalog size', () => {
  const question = generate('pokedex-scan')[0]!;
  expect(
    isQuestionHistory(
      rememberShownQuestion(
        emptyQuestionHistory(),
        question,
        'long-round',
        2000,
      ),
    ),
  ).toBe(true);
  expect(
    isQuestionLineup({
      seed: 'long-lineup',
      contentVersion: catalog.contentVersion,
      questions: Array.from({ length: 2000 }, () => question),
    }),
  ).toBe(true);
  expect(
    isQuestionData({
      ...question,
      options: [...question.options, 'future-option'],
    }),
  ).toBe(true);
  expect(isQuestionData({ ...question, options: [] })).toBe(false);
  expect(
    isQuestionData({
      ...question,
      options: [...question.options, question.options[0]],
    }),
  ).toBe(false);
});

it('rejects unknown visual and media variants in persisted questions', () => {
  const question = generate('pokedex-scan')[0]!;
  expect(
    isQuestionData({ ...question, visual: { kind: 'unregistered' } }),
  ).toBe(false);
  expect(isQuestionData({ ...question, media: { kind: 'unregistered' } })).toBe(
    false,
  );
  expect(isQuestionData({ ...question, media: { kind: 'toString' } })).toBe(
    false,
  );
});
