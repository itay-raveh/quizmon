import { isChoice, isRecord } from '../../lib/validation';
import { generations } from '../pokemon/types';
import {
  subjectKinds,
  type AnswerSubject,
  type QuestionSubject,
} from './types';

export const isAnswerSubject = (value: unknown): value is AnswerSubject =>
  isRecord(value) &&
  isChoice(value.kind, subjectKinds) &&
  (value.name === undefined ||
    (typeof value.name === 'string' &&
      value.name.length > 0 &&
      value.name.length <= 200)) &&
  (value.generation === undefined || isChoice(value.generation, generations));

export const isQuestionSubject = (value: unknown): value is QuestionSubject =>
  isAnswerSubject(value) &&
  typeof value.name === 'string' &&
  value.generation !== undefined &&
  isRecord(value) &&
  (value.kind === 'pokemon'
    ? Array.isArray(value.types) &&
      value.types.every((type) => typeof type === 'string')
    : value.types === undefined);

export const migrateSubject = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  const { pokemonName, pokemonTypes, generation, ...current } = value;
  if (current.subject !== undefined) return current;
  if (
    pokemonName === undefined &&
    generation === undefined &&
    pokemonTypes === undefined
  )
    return current;
  return {
    ...current,
    subject: {
      kind: 'pokemon',
      ...(pokemonName === undefined ? {} : { name: pokemonName }),
      ...(generation === undefined ? {} : { generation }),
      ...(pokemonTypes === undefined ? {} : { types: pokemonTypes }),
    },
  };
};

export const migrateRoundSubjects = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return {
    ...value,
    ...(Array.isArray(value.questions)
      ? { questions: value.questions.map(migrateSubject) }
      : {}),
    ...(Array.isArray(value.answers)
      ? { answers: value.answers.map(migrateSubject) }
      : {}),
  };
};
