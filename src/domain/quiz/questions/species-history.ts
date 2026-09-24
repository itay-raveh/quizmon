import type { PokemonCatalog } from '../../pokemon/types.ts';
import type { QuestionHistory } from '../question-history.ts';
import type { QuestionData } from '../types.ts';
import type { QuestionContext } from './context.ts';

export const speciesName = (catalog: PokemonCatalog, name: string): string =>
  catalog.pokemon[name]?.speciesName ?? name;

const speciesIdentity = (catalog: PokemonCatalog, identity: string): string => {
  if (identity.startsWith('[')) {
    try {
      const parts: unknown = JSON.parse(identity);
      if (
        Array.isArray(parts) &&
        parts.length === 5 &&
        typeof parts[1] === 'string' &&
        (typeof parts[3] === 'string' ||
          (Array.isArray(parts[3]) &&
            parts[3].every((name) => typeof name === 'string'))) &&
        Array.isArray(parts[4]) &&
        parts[4].every((name) => typeof name === 'string')
      ) {
        const names = (values: string[]) =>
          values.map((name) => speciesName(catalog, name)).sort();
        return JSON.stringify([
          parts[0],
          speciesName(catalog, parts[1]),
          parts[2],
          typeof parts[3] === 'string'
            ? speciesName(catalog, parts[3])
            : names(parts[3]),
          names(parts[4]),
        ]);
      }
      return identity;
    } catch {
      return identity;
    }
  }
  if (catalog.pokemon[identity]) return speciesName(catalog, identity);
  return identity
    .split(':')
    .map((part) =>
      part
        .split(',')
        .map((name) => speciesName(catalog, name))
        .sort()
        .join(','),
    )
    .join(':');
};

const historyKey = (key: string, normalize: (name: string) => string) => {
  const separator = key.indexOf(':');
  return separator < 0
    ? key
    : `${key.slice(0, separator + 1)}${normalize(key.slice(separator + 1))}`;
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
  // Read existing form-keyed saves as species history without rewriting saved lineups.
  const normalized = {
    ...history,
    subjects: merge(history.subjects, (key) =>
      historyKey(key, (name) => speciesName(catalog, name)),
    ),
    questions: merge(history.questions, (key) =>
      historyKey(key, (identity) => speciesIdentity(catalog, identity)),
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
  questionType: question.questionType,
  repetition: {
    ...question.repetition,
    identity: speciesIdentity(catalog, question.repetition.identity),
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
