import type { PokemonCatalog } from '../../pokemon/types.ts';
import type { QuestionHistory } from '../history.ts';
import type { QuestionData } from '../types.ts';
import type { QuestionContext } from './context.ts';

export const speciesName = (catalog: PokemonCatalog, name: string): string =>
  catalog.pokemon[name]?.speciesName ?? name;

const normalizeQuestionKey = (catalog: PokemonCatalog, key: string) => {
  try {
    const parts: unknown = JSON.parse(key);
    if (
      Array.isArray(parts) &&
      parts.length === 3 &&
      typeof parts[0] === 'string' &&
      typeof parts[1] === 'string' &&
      Array.isArray(parts[2]) &&
      parts[2].every((value) => typeof value === 'string')
    )
      return JSON.stringify([
        parts[0],
        speciesName(catalog, parts[1]),
        parts[2].map((name: string) => speciesName(catalog, name)).sort(),
      ]);
  } catch {
    return key;
  }
  return key;
};

const cache = new WeakMap<
  QuestionHistory,
  WeakMap<PokemonCatalog, QuestionHistory>
>();

export const getSpeciesHistory = ({
  history,
  catalog,
}: QuestionContext): QuestionHistory | undefined => {
  if (!history) return undefined;
  const cached = cache.get(history)?.get(catalog);
  if (cached) return cached;
  const merge = (
    entries: Record<string, number>,
    key: (name: string) => string,
  ) => {
    const result: Record<string, number> = {};
    for (const [name, sequence] of Object.entries(entries)) {
      const species = key(name);
      result[species] = Math.max(result[species] ?? 0, sequence);
    }
    return result;
  };
  const normalized = {
    ...history,
    subjects: merge(history.subjects, (key) => {
      const separator = key.indexOf(':');
      return separator < 0
        ? key
        : `${key.slice(0, separator + 1)}${speciesName(catalog, key.slice(separator + 1))}`;
    }),
    questions: merge(history.questions, (key) =>
      normalizeQuestionKey(catalog, key),
    ),
    pokemon: merge(history.pokemon, (name) => speciesName(catalog, name)),
    distractors: merge(history.distractors, (name) =>
      speciesName(catalog, name),
    ),
  };
  const catalogs =
    cache.get(history) ?? new WeakMap<PokemonCatalog, QuestionHistory>();
  catalogs.set(catalog, normalized);
  cache.set(history, catalogs);
  return normalized;
};

export const speciesQuestion = (
  catalog: PokemonCatalog,
  question: QuestionData,
) => ({
  ...question,
  subject: {
    ...question.subject,
    name: speciesName(catalog, question.subject.name),
  },
  answer: {
    ...question.answer,
    correctOptions: question.answer.correctOptions.map((name) =>
      speciesName(catalog, name),
    ),
  },
  repetition: {
    ...question.repetition,
    subjects: [
      ...new Set(
        question.repetition.subjects.map((name) => speciesName(catalog, name)),
      ),
    ],
    primary: [
      ...new Set(
        question.repetition.primary.map((name) => speciesName(catalog, name)),
      ),
    ],
    distractors: [
      ...new Set(
        question.repetition.distractors.map((name) =>
          speciesName(catalog, name),
        ),
      ),
    ],
  },
});
