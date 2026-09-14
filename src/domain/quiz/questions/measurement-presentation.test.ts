import { createQuestionContext } from '../../../../tests/fixtures/catalog';
import { buildQuestionType } from './registry';
import { presentMeasurementQuestion } from './measurement-presentation';
import { isQuestionData } from '../question-lineup';

it.each(['weight-comparison', 'height-comparison'] as const)(
  'restores the comparison visual for a saved %s question',
  (questionType) => {
    const question = buildQuestionType(
      { ...createQuestionContext(questionType), difficulty: 3 },
      questionType,
    )!;
    expect(question).toBeDefined();
    expect(isQuestionData(question)).toBe(true);
    const saved = { ...question, visual: undefined };
    expect(presentMeasurementQuestion(saved)).toEqual(question);
  },
);
