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
