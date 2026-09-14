import {
  catalog,
  createQuestionContext,
} from '../../../tests/fixtures/catalog';
import { buildQuestionType } from '../../domain/quiz/questions/registry';
import {
  emptyQuestionHistory,
  rememberQuestion,
} from '../../domain/quiz/question-history';
import { migrateRoundSubjects } from '../../domain/quiz/subject';
import { normalizeResults } from '../../domain/player/results';
import { addResultToProgress } from '../../domain/player/progress';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import type { AnswerResult, GameResult } from '../../domain/quiz/types';
import {
  createBackup,
  parseBackup,
  restoreBackup,
} from '../../features/settings/backup';
import { readPlayerSave } from './player-storage';
import { readActiveGame, writeActiveGame } from './active-game-storage';

const questions = (
  [
    'item-identification',
    'weight-comparison',
    'move-types',
    'name-that-region',
    'evolution-conditions',
    'berry-flavors',
  ] as const
).map((type) =>
  buildQuestionType(
    { ...createQuestionContext(`save:${type}`), difficulty: 5 },
    type,
  )!,
);
const answers: AnswerResult[] = questions.map((question) => ({
  category: question.category,
  questionType: question.questionType,
  subject: {
    kind: question.subject.kind,
    name: question.subject.name,
    generation: question.subject.generation,
  },
  correct: true,
  cluesUsed: 0,
  points: 1000,
}));
const result: GameResult = {
  answers,
  contentVersion: catalog.contentVersion,
  correctCount: answers.length,
  questionCount: answers.length,
  elapsedSeconds: 30,
  score: answers.length * 1000,
};
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
it('retains actual subjects, full lists, methods and reveals through active-round reload', () => {
  expect(questions.every(Boolean)).toBe(true);
  expect(
    writeActiveGame({
      questions,
      answers: answers.slice(0, 2),
      contentVersion: catalog.contentVersion,
      questionCount: questions.length,
      elapsedMilliseconds: 5000,
      mode: { kind: 'training' },
      settings: { ...defaultGameSettings, difficulty: 5 },
      seed: 'expanded-save',
    }),
  ).toBe(true);
  const restored = readActiveGame(catalog)!;
  expect(restored.questions).toEqual(questions);
  expect(restored.answers).toEqual(answers.slice(0, 2));
  expect(JSON.stringify(restored)).not.toContain('pokemonName');
  expect(JSON.stringify(restored)).not.toContain('pokemonTypes');
});
it('round-trips non-Pokémon results and namespaced history through a backup', () => {
  const backup = createBackup();
  backup.save.data.results.training.custom = result;
  backup.save.data.questionHistory = questions.reduce(
    (history, question) => rememberQuestion(history, question),
    emptyQuestionHistory(),
  );
  restoreBackup(parseBackup(JSON.stringify(backup)));
  const restored = readPlayerSave().data;
  expect(restored.results.training.custom).toEqual(result);
  expect(restored.questionHistory).toEqual(backup.save.data.questionHistory);
  expect(
    Object.keys(restored.questionHistory.pokemon).every(
      (name) => !!catalog.pokemon[name],
    ),
  ).toBe(true);
});
it('credits families and mapped specialties without giving non-Pokémon discoveries', () => {
  const progress = addResultToProgress(
    normalizeResults(null).progress,
    result,
    { kind: 'training' },
    defaultGameSettings,
  );
  expect(progress.correctPokemon.sort()).toEqual(
    answers
      .filter((answer) => answer.subject.kind === 'pokemon')
      .map((answer) => answer.subject.name!)
      .sort(),
  );
  expect(
    Object.values(progress.correctGenerations).reduce((a, b) => a + b, 0),
  ).toBe(answers.filter((answer) => answer.subject.kind === 'pokemon').length);
  for (const answer of answers)
    expect(
      progress.correctQuestionTypes[
        answer.questionType as 'item-identification'
      ],
    ).toBe(1);
  expect(progress.correctCategories.move).toBe(1);
  expect(progress.correctCategories.evolution).toBe(1);
});
it('converts legacy fields at the load boundary without retaining a second schema', () => {
  const current = questions[1]!;
  const { subject, ...rest } = current;
  const legacy = {
    ...rest,
    pokemonName: subject.name,
    pokemonTypes: subject.types,
    generation: subject.generation,
  };
  expect(
    migrateRoundSubjects({
      questions: [legacy],
      answers: [
        {
          pokemonName: 'pikachu',
          generation: 'I',
          correct: true,
          points: 1000,
        },
      ],
    }),
  ).toEqual({
    questions: [current],
    answers: [
      {
        subject: { kind: 'pokemon', name: 'pikachu', generation: 'I' },
        correct: true,
        points: 1000,
      },
    ],
  });
});
