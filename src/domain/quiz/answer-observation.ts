import { isRecord } from '../../lib/validation.ts';
import type { AnswerObservation, QuestionData } from './types.ts';

export function observeAnswer(
  question: QuestionData,
  selected: string[],
): AnswerObservation {
  return {
    questionId: question.id,
    ...(question.optionLabels ? { labels: { ...question.optionLabels } } : {}),
    ...(question.clues ? { clues: structuredClone(question.clues) } : {}),
    ...(question.suppliedClues
      ? { suppliedClues: [...question.suppliedClues] }
      : {}),
    prompt: structuredClone(question.prompt),
    ...(question.context ? { context: question.context } : {}),
    ...(question.variantLevel ? { difficulty: question.variantLevel } : {}),
    interaction: question.answer.interaction,
    options: [...question.options],
    expected: [...question.answer.correctOptions],
    selected: [...selected],
  };
}

export function isAnswerObservation(
  value: unknown,
): value is AnswerObservation {
  if (!isRecord(value) || !isRecord(value.prompt)) return false;
  const strings = (v: unknown): v is string[] =>
    Array.isArray(v) &&
    v.length <= 100 &&
    v.every((item) => typeof item === 'string' && item.length <= 2000) &&
    new Set(v).size === v.length;
  const text = (v: unknown) => typeof v === 'string' && v.length <= 4000;
  const prompt = value.prompt;
  if (
    (prompt.supportingText !== undefined && !text(prompt.supportingText)) ||
    (value.labels !== undefined &&
      (!isRecord(value.labels) ||
        Object.keys(value.labels).length > 100 ||
        !Object.entries(value.labels).every(
          ([key, label]) => text(key) && text(label),
        ))) ||
    (value.suppliedClues !== undefined && !strings(value.suppliedClues)) ||
    (value.clues !== undefined &&
      (!Array.isArray(value.clues) ||
        value.clues.length > 100 ||
        !value.clues.every(
          (clue) =>
            text(clue) ||
            (isRecord(clue) &&
              clue.kind === 'generation' &&
              text(clue.generation) &&
              strings(clue.types)),
        )))
  )
    return false;
  return (
    typeof value.questionId === 'string' &&
    value.questionId.length > 0 &&
    value.questionId.length <= 2000 &&
    (prompt.kind === 'text'
      ? typeof prompt.text === 'string' && prompt.text.length <= 4000
      : prompt.kind === 'pokemon' &&
        text(prompt.name) &&
        text(prompt.before) &&
        text(prompt.after) &&
        Number.isSafeInteger(prompt.dexNumber)) &&
    (value.context === undefined ||
      (typeof value.context === 'string' && value.context.length <= 4000)) &&
    (value.difficulty === undefined ||
      (Number.isInteger(value.difficulty) &&
        Number(value.difficulty) >= 1 &&
        Number(value.difficulty) <= 5)) &&
    ['single-choice', 'multi-select', 'search'].includes(
      String(value.interaction),
    ) &&
    strings(value.options) &&
    strings(value.expected) &&
    value.expected.length > 0 &&
    strings(value.selected) &&
    (value.interaction === 'multi-select' || value.selected.length <= 1)
  );
}

export function observationCorrect(value: AnswerObservation) {
  return (
    value.selected.length === value.expected.length &&
    value.expected.every((answer) => value.selected.includes(answer))
  );
}
