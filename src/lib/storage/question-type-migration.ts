import { questionTypes } from '../../domain/quiz/questions/definitions.ts';
import { isRecord } from '../validation.ts';

const oldToNew = new Map(
  questionTypes.map((type) => [
    type.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
    type,
  ]),
);
const current = new Set<string>([...questionTypes, 'champion']);
const typeFields = new Set(['questionType', 'question_type']);
const typeLists = new Set([
  'questionTypes',
  'automaticQuestionTypes',
  'question_types',
  'auto_types',
]);

const migrateType = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const type = oldToNew.get(value) ?? value;
  return current.has(type) ? type : undefined;
};

const migrateQuestionId = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const colon = value.indexOf(':');
  if (colon < 0) return oldToNew.get(value) ?? value;
  return `${oldToNew.get(value.slice(0, colon)) ?? value.slice(0, colon)}${value.slice(colon)}`;
};

const migrateRecency = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, seen]) => {
      const colon = key.indexOf(':');
      if (colon < 0) return [];
      const type = migrateType(key.slice(0, colon));
      return type ? [[`${type}${key.slice(colon)}`, seen]] : [];
    }),
  );
};

/** One-time schema migration for saved question-family IDs. */
export const migrateQuestionTypes = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(migrateQuestionTypes);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (typeFields.has(key)) return [key, migrateType(entry) ?? entry];
      if (key === 'id' || key === 'questionId')
        return [key, migrateQuestionId(entry)];
      if ((key === 'kind' || key === 'layout') && typeof entry === 'string')
        return [key, oldToNew.get(entry) ?? entry];
      if (typeLists.has(key) && Array.isArray(entry)) {
        const migrated = entry
          .map(migrateType)
          .filter((type) => type !== undefined);
        return [
          key,
          migrated.length || !['questionTypes', 'question_types'].includes(key)
            ? migrated
            : [...questionTypes],
        ];
      }
      if (key === 'correctQuestionTypes' && isRecord(entry))
        return [
          key,
          Object.fromEntries(
            Object.entries(entry).flatMap(([type, count]) => {
              const migrated = migrateType(type);
              return migrated ? [[migrated, count]] : [];
            }),
          ),
        ];
      if (key === 'questionHistory' && isRecord(entry))
        return [
          key,
          {
            ...entry,
            subjects: migrateRecency(entry.subjects),
            questions: migrateRecency(entry.questions),
          },
        ];
      return [key, migrateQuestionTypes(entry)];
    }),
  );
};
