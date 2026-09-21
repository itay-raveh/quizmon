import { createQuestionContext } from '../../../tests/fixtures/catalog';
import { buildQuestionType } from './questions/registry';
import { questionLabels } from './question-labels';
import type { QuestionType } from './types';
import type { Difficulty } from './difficulty';
import {
  isAnswerObservation,
  observationCorrect,
  observeAnswer,
} from './answer-observation';

it.each([1, 2, 3, 4, 5] as Difficulty[])(
  'records level %i questions without retaining mutable data',
  (difficulty) => {
    for (const type of Object.keys(questionLabels) as QuestionType[]) {
      const generated = buildQuestionType(
        {
          ...createQuestionContext(`observation:${type}:${difficulty}`),
          difficulty,
        },
        type,
      );
      if (!generated) continue;
      const question = structuredClone(generated);
      const selected = [...question.answer.correctOptions];
      const observation = observeAnswer(question, selected);
      expect(isAnswerObservation(observation), `${type}:${difficulty}`).toBe(
        true,
      );
      expect(observationCorrect(observation)).toBe(true);
      selected.length = 0;
      question.options.length = 0;
      question.answer.correctOptions.length = 0;
      expect(observation.expected.length).toBeGreaterThan(0);
      expect(observation.selected).toEqual(observation.expected);
    }
  },
  30_000,
);

it('rejects malformed answer evidence and retains incorrect selections', () => {
  const question = buildQuestionType(
    createQuestionContext('observation:validation'),
    'pokedex-scan',
  )!;
  const observation = observeAnswer(question, ['not-the-answer']);
  expect(isAnswerObservation(observation)).toBe(true);
  expect(observationCorrect(observation)).toBe(false);
  for (const change of [
    { selected: ['a', 'a'] },
    { expected: [] },
    { interaction: 'unknown' },
    { labels: { a: 42 } },
    { clues: [{ kind: 'generation', generation: 'I', types: null }] },
    { prompt: { kind: 'text', text: 'Question', supportingText: 42 } },
  ])
    expect(isAnswerObservation({ ...observation, ...change })).toBe(false);
});
