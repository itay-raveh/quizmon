import { isRecord } from './validation';
import type { QuestionRepetition } from './types';

interface HistoryQuestion {
  questionType: string;
  repetition: QuestionRepetition;
}

export const questionRepeatPolicy = {
  candidateAttempts: 6,
  rememberedQuestions: 4096,
  rememberedRounds: 128,
  primaryWeight: 4,
} as const;

export interface QuestionHistory {
  sequence: number;
  subjects: Record<string, number>;
  questions: Record<string, number>;
  pokemon: Record<string, number>;
  distractors: Record<string, number>;
  rounds: Record<string, { index: number; sequence: number }>;
}

export const emptyQuestionHistory = (): QuestionHistory => ({
  sequence: 0,
  subjects: {},
  questions: {},
  pokemon: {},
  distractors: {},
  rounds: {},
});

const lastSeen = (entries: Record<string, number>, key: string): number =>
  Object.hasOwn(entries, key) ? entries[key]! : 0;

const subjectKey = (type: string, name: string): string => `${type}:${name}`;

export const getSubjectRecency = (
  history: QuestionHistory,
  type: string,
  name: string,
): number => lastSeen(history.subjects, subjectKey(type, name));

export const getPokemonRecency = (
  history: QuestionHistory,
  name: string,
): number =>
  (questionRepeatPolicy.primaryWeight /
    (history.sequence + 1 - lastSeen(history.pokemon, name))) *
    Number(lastSeen(history.pokemon, name) > 0) +
  (1 / (history.sequence + 1 - lastSeen(history.distractors, name))) *
    Number(lastSeen(history.distractors, name) > 0);

export const getQuestionKey = (question: HistoryQuestion): string =>
  `${question.questionType}:${question.repetition.identity}`;

export const getQuestionSubjects = (question: HistoryQuestion): string[] =>
  question.repetition.subjects;

export const getQuestionExposure = (question: HistoryQuestion) => ({
  primary: question.repetition.primary,
  distractors: question.repetition.distractors,
});

export const getQuestionRecency = (
  history: QuestionHistory,
  question: HistoryQuestion,
): number => lastSeen(history.questions, getQuestionKey(question));

const retainNewest = (
  entries: Record<string, number>,
  limit: number,
): Record<string, number> => {
  const values = Object.entries(entries);
  return values.length <= limit
    ? entries
    : Object.fromEntries(values.sort((a, b) => b[1] - a[1]).slice(0, limit));
};

export const rememberQuestion = (
  history: QuestionHistory,
  question: HistoryQuestion,
): QuestionHistory => {
  const sequence = history.sequence + 1;
  const exposure = getQuestionExposure(question);
  const update = (entries: Record<string, number>, keys: string[]) => ({
    ...entries,
    ...Object.fromEntries(keys.map((key) => [key, sequence])),
  });
  return {
    sequence,
    subjects: update(
      history.subjects,
      getQuestionSubjects(question).map((name) =>
        subjectKey(question.questionType, name),
      ),
    ),
    questions: retainNewest(
      update(history.questions, [getQuestionKey(question)]),
      questionRepeatPolicy.rememberedQuestions,
    ),
    pokemon: update(history.pokemon, exposure.primary),
    distractors: update(history.distractors, exposure.distractors),
    rounds: history.rounds,
  };
};

export const rememberShownQuestion = (
  history: QuestionHistory,
  question: HistoryQuestion,
  roundId: string,
  index: number,
): QuestionHistory => {
  if (
    Object.hasOwn(history.rounds, roundId) &&
    history.rounds[roundId]!.index >= index
  )
    return history;
  return {
    ...rememberQuestion(history, question),
    rounds: Object.fromEntries(
      Object.entries({
        ...history.rounds,
        [roundId]: { index, sequence: history.sequence + 1 },
      })
        .sort((a, b) => b[1].sequence - a[1].sequence)
        .slice(0, questionRepeatPolicy.rememberedRounds),
    ),
  };
};

export const isQuestionHistory = (value: unknown): value is QuestionHistory => {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.sequence) ||
    (value.sequence as number) < 0
  )
    return false;
  if (
    !isRecord(value.rounds) ||
    !Object.entries(value.rounds).every(
      ([key, round]) =>
        key.length > 0 &&
        key.length <= 200 &&
        isRecord(round) &&
        Number.isSafeInteger(round.index) &&
        (round.index as number) >= 0 &&
        Number.isSafeInteger(round.sequence) &&
        (round.sequence as number) > 0 &&
        (round.sequence as number) <= (value.sequence as number),
    )
  )
    return false;
  return ['subjects', 'questions', 'pokemon', 'distractors'].every((field) => {
    const entries = value[field];
    return (
      isRecord(entries) &&
      Object.entries(entries).every(
        ([key, seen]) =>
          key.length > 0 &&
          key.length <= 1000 &&
          Number.isSafeInteger(seen) &&
          (seen as number) >= 0 &&
          (seen as number) <= (value.sequence as number),
      )
    );
  });
};
