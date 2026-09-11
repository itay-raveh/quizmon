import { catalog } from '../../../tests/fixtures/catalog';
import {
  createBackup,
  parseBackup,
  restoreBackup,
} from '../../features/settings/backup';
import { createSeededRandom } from '../../lib/random';
import {
  readActiveGame,
  writeActiveGame,
} from '../../lib/storage/active-game-storage';
import {
  readPlayerSave,
  updatePlayerData,
} from '../../lib/storage/player-storage';
import { registerShownQuestion } from '../../lib/storage/question-history-storage';
import type { Generation } from '../pokemon/types';
import { defaultGameSettings } from '../settings/game-settings';
import {
  buildDailyQuestions,
  buildLeagueQuestions,
  buildQuestions,
} from './question-generation';
import {
  emptyQuestionHistory,
  getQuestionKey,
  getQuestionRecency,
  getSubjectRecency,
  isQuestionHistory,
  rememberQuestion,
  rememberShownQuestion,
} from './question-history';
import { isQuestionData, isQuestionLineup } from './question-lineup';
import type { QuestionBuilder, QuestionDraft } from './questions/context';
import { questionTypes } from './questions/definitions';
import { optionSetRepetition, targetRepetition } from './questions/repetition';
import type { QuestionType } from './types';

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
    { ...defaultGameSettings, questionTypes: [type], generations },
    createSeededRandom(seed),
    count,
    history,
  );

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
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
    defaultGameSettings.generations,
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
  expect(next.map(({ pokemonName }) => pokemonName)).not.toContain(
    questions[0]!.pokemonName,
  );
  expect(new Set(next.map(getQuestionKey)).size).toBe(39);
});

it('tracks all correct Pokémon in Legend Hunt and covers the restricted species pool', () => {
  let history = emptyQuestionHistory();
  const seen = new Set<string>();
  const total = new Set(
    Object.values(catalog.pokemon)
      .filter(
        (pokemon) =>
          genFive.includes(pokemon.generation) &&
          pokemon.sprite &&
          (pokemon.isLegendary || pokemon.isMythical),
      )
      .map((pokemon) => pokemon.speciesName),
  ).size;
  for (let i = 0; i < Math.ceil(total / 2); i++) {
    const question = generate('legend-hunt', history, `legends:${i}`)[0]!;
    const species = question.answer.correctOptions.map(
      (name) => catalog.pokemon[name]!.speciesName,
    );
    const fresh = species.filter((name) => !seen.has(name));
    expect(fresh).toHaveLength(
      Math.min(total - seen.size, question.answer.correctOptions.length),
    );
    for (const name of species) seen.add(name);
    history = rememberQuestion(history, question);
    for (const name of question.answer.correctOptions) {
      expect(history.subjects[`legend-hunt:${name}`]).toBe(history.sequence);
    }
  }
  expect(seen.size).toBe(total);
});

it('does not confuse button order or sprite crops with a new question', () => {
  const question = generate('pixel-peek')[0]!;
  const changed = {
    ...question,
    id: 'another-id',
    options: question.options.toReversed(),
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
    options: group.options.toReversed(),
  };
  reordered.repetition = optionSetRepetition({ subjects: 'correct' })(
    reordered,
  );
  expect(getQuestionKey(reordered)).toBe(getQuestionKey(group));
});

it('distinguishes stat and matchup questions while keeping related Pokémon exposure', () => {
  const stat = generate('stat-showdown')[0]!;
  expect.assert(
    stat.visual?.kind === 'stat-showdown',
    'Expected stat question',
  );
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
  const exposure = generate('evolution-link')[0]!.repetition;
  expect(exposure.primary).toHaveLength(3);
  expect(exposure.distractors).toHaveLength(3);
});

it('avoids recently featured Pokémon across question formats', () => {
  const question = generate('pokedex-scan')[0]!;
  const history = rememberQuestion(emptyQuestionHistory(), question);
  const next = generate('silhouette-match', history, 'different-format')[0]!;
  expect(next.repetition.primary).not.toContain(question.pokemonName);
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
        const key = getQuestionKey(question);
        expect(keys).not.toContain(key);
        keys.add(key);
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
  const leagueLineup = {
    seed: 'league-history',
    contentVersion: catalog.contentVersion,
    questions: buildLeagueQuestions(
      catalog,
      'league-history',
      defaultGameSettings,
    ),
  };
  updatePlayerData({ leagueLineup });
  const backup = parseBackup(JSON.stringify(createBackup()));
  localStorage.clear();
  restoreBackup(backup);
  expect(readPlayerSave().data.questionHistory.sequence).toBe(1);
  expect(readPlayerSave().data.leagueLineup).toEqual(leagueLineup);
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
    settings: defaultGameSettings,
    questionCount: questions.length,
    seed: 'saved',
  });
  updatePlayerData({
    questionHistory: questions.reduce(rememberQuestion, emptyQuestionHistory()),
  });
  expect(readActiveGame(catalog)?.questions).toEqual(questions);
  expect(readActiveGame(catalog)?.version).toBe(2);
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
  for (const sequence of [
    -1,
    0.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    '1',
  ]) {
    expect(isQuestionHistory({ ...history, sequence })).toBe(false);
  }
  expect(
    isQuestionHistory({ ...history, sequence: Number.MAX_SAFE_INTEGER }),
  ).toBe(true);
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

it('cycles all 40 Evolution Shift targets in oldest-first order over twenty games', () => {
  let history = emptyQuestionHistory();
  const last = new Map<string, number>();
  let position = 0;
  for (let game = 0; game < 20; game++) {
    const questions = generate(
      'evolution-shift',
      history,
      `long-run:${game}`,
      10,
    );
    expect(questions).toHaveLength(10);
    for (const question of questions) {
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
        const key = getQuestionKey(question);
        expect(keys).not.toContain(key);
        keys.add(key);
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
