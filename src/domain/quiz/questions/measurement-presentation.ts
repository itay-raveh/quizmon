import type { QuestionData } from '../types.ts';

export const presentMeasurementQuestion = (
  question: QuestionData,
): QuestionData => {
  if (question.visual || question.prompt.kind !== 'text') return question;
  const measurement =
    question.questionType === 'weight-comparison'
      ? 'weight'
      : question.questionType === 'height-comparison'
        ? 'height'
        : undefined;
  if (!measurement) return question;
  // Older saved questions predate the structured comparison visual.
  const direction = /(?:heaviest|tallest)\?$/.test(question.prompt.text)
    ? 'highest'
    : /(?:lightest|shortest)\?$/.test(question.prompt.text)
      ? 'lowest'
      : undefined;
  return direction
    ? {
        ...question,
        visual: { kind: 'measurement-comparison', measurement, direction },
      }
    : question;
};
