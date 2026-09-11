import type { PokemonCatalog } from '../../pokemon/types';
import type { QuestionHistory } from '../question-history';
import type { QuestionData } from '../types';
import type { QuestionContext } from './context';

export const speciesName = (catalog: PokemonCatalog, name: string): string =>
  catalog.pokemon[name]?.speciesName ?? name;

const speciesIdentity = (catalog: PokemonCatalog, identity: string): string =>
  identity
    .split(':')
    .map((part) =>
      part
        .split(',')
        .map((name) => speciesName(catalog, name))
        .sort()
        .join(','),
    )
    .join(':');

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
    subjects: merge(history.subjects, (name) => speciesIdentity(catalog, name)),
    questions: merge(history.questions, (name) =>
      speciesIdentity(catalog, name),
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
