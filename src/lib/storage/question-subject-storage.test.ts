import { observeAnswer } from '../../domain/quiz/answer-observation';
import { completion } from '../../../tests/online/progress-fixtures';
import { hash } from '../../domain/sync/progress';
import { resetLocalSave } from '../../../tests/fixtures/local-save';
beforeEach(resetLocalSave);
import {
  catalog,
  createQuestionContext,
} from '../../../tests/fixtures/catalog';
import { buildQuestionType } from '../../domain/quiz/questions/registry';
import {
  emptyQuestionHistory,
  rememberQuestion,
} from '../../domain/quiz/question-history';
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
  responseMilliseconds: 5000,
  speedBonus: 0,
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
it('retains actual subjects, full lists, methods and reveals through active-round reload', async () => {
  expect(questions.every(Boolean)).toBe(true);
  expect(
    await writeActiveGame({
      questions,
      answers: answers.slice(0, 2),
      contentVersion: catalog.contentVersion,
      questionCount: questions.length,
      elapsedMilliseconds: 5000,
      mode: { kind: 'training' },
      settings: { ...defaultGameSettings, difficulty: 5 },
      seed: 'expanded-save',
    }),
  ).toBeUndefined();
  const restored = readActiveGame(catalog)!;
  expect(restored.questions).toEqual(questions);
  expect(restored.answers).toEqual(answers.slice(0, 2));
  expect(JSON.stringify(restored)).not.toContain('pokemonName');
  expect(JSON.stringify(restored)).not.toContain('pokemonTypes');
});
it('round-trips non-Pokémon results and namespaced history through a backup', async () => {
  const backup = await createBackup();
  const game = completion(backup.state.datasetId);
  game.result = {
    ...game.result,
    ...result,
    scoreVersion: 3,
    elapsedMilliseconds: 30000,
    answers: questions.map((question, index) => ({
      ...answers[index]!,
      observation: observeAnswer(question, question.answer.correctOptions),
    })),
  };
  backup.records.local_completions.push({
    id: game.completionId,
    payload: JSON.stringify({
      hash: await hash(game),
      completion: game,
      eligible: true,
      outcome: { best: game.result, isSaved: true, isNewBest: true },
    }),
  });
  backup.save.data.questionHistory = questions.reduce(
    (history, question) => rememberQuestion(history, question),
    emptyQuestionHistory(),
  );
  await restoreBackup(parseBackup(JSON.stringify(backup)));
  const restored = readPlayerSave().data;
  expect(restored.results.training['score:3']).toEqual(game.result);
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
