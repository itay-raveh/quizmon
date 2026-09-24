import { z } from 'zod';
import type { QuestionRepetition } from './types.ts';

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

const sequence = z.int().min(0);
const recency = z.record(z.string().min(1).max(1000), sequence);
export const questionHistorySchema = z
  .object({
    sequence,
    subjects: recency,
    questions: recency,
    pokemon: recency,
    distractors: recency,
    rounds: z.record(
      z.string().min(1).max(200),
      z.object({ index: sequence, sequence: z.int().min(1) }),
    ),
  })
  .refine(
    ({ sequence, rounds, subjects, questions, pokemon, distractors }) =>
      Object.values(rounds).every((round) => round.sequence <= sequence) &&
      [subjects, questions, pokemon, distractors].every((entries) =>
        Object.values(entries).every((seen) => seen <= sequence),
      ),
  );

export type QuestionHistory = z.infer<typeof questionHistorySchema>;

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
): number => {
  const primary = lastSeen(history.pokemon, name);
  const distractor = lastSeen(history.distractors, name);
  return (
    (questionRepeatPolicy.primaryWeight / (history.sequence + 1 - primary)) *
      Number(primary > 0) +
    (1 / (history.sequence + 1 - distractor)) * Number(distractor > 0)
  );
};

const getQuestionKey = (question: HistoryQuestion): string =>
  `${question.questionType}:${question.repetition.identity}`;

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
  const { subjects, primary, distractors } = question.repetition;
  const update = (entries: Record<string, number>, keys: string[]) => ({
    ...entries,
    ...Object.fromEntries(keys.map((key) => [key, sequence])),
  });
  return {
    sequence,
    subjects: update(
      history.subjects,
      subjects.map((name) => subjectKey(question.questionType, name)),
    ),
    questions: retainNewest(
      { ...history.questions, [getQuestionKey(question)]: sequence },
      questionRepeatPolicy.rememberedQuestions,
    ),
    pokemon: update(history.pokemon, primary),
    distractors: update(history.distractors, distractors),
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
  const remembered = rememberQuestion(history, question);
  return {
    ...remembered,
    rounds: Object.fromEntries(
      Object.entries({
        ...history.rounds,
        [roundId]: { index, sequence: remembered.sequence },
      })
        .sort((a, b) => b[1].sequence - a[1].sequence)
        .slice(0, questionRepeatPolicy.rememberedRounds),
    ),
  };
};
