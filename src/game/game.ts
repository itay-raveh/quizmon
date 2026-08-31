import {
  formCategories,
  generations,
  type FormCategory,
  type Generation,
  type Modifiers,
  type PokemonCatalog,
  type QuestionData,
} from './types';

export const defaultModifiers: Modifiers = {
  generations: ['I'],
  formCategories: ['default'],
  randomSprite: false,
  whosThatPokemon: false,
  isLimitActive: true,
  limit: 10,
  speedrunMode: false,
};

const isGeneration = (value: unknown): value is Generation =>
  typeof value === 'string' && generations.includes(value as Generation);

const isFormCategory = (value: unknown): value is FormCategory =>
  typeof value === 'string' && formCategories.includes(value as FormCategory);

export const normalizeModifiers = (value: unknown): Modifiers => {
  if (!value || typeof value !== 'object') return defaultModifiers;

  const candidate = value as Partial<Modifiers>;
  const selectedGenerations = Array.isArray(candidate.generations)
    ? candidate.generations.filter(isGeneration)
    : [];
  const selectedCategories = Array.isArray(candidate.formCategories)
    ? candidate.formCategories.filter(isFormCategory)
    : [];
  const limit = Number.isFinite(candidate.limit)
    ? Math.max(1, Math.trunc(candidate.limit as number))
    : defaultModifiers.limit;

  return {
    generations:
      selectedGenerations.length > 0
        ? selectedGenerations
        : defaultModifiers.generations,
    formCategories:
      selectedCategories.length > 0
        ? selectedCategories
        : defaultModifiers.formCategories,
    randomSprite: candidate.randomSprite === true,
    whosThatPokemon: candidate.whosThatPokemon === true,
    isLimitActive: candidate.isLimitActive !== false,
    limit,
    speedrunMode: candidate.speedrunMode === true,
  };
};

export const filterPokemon = (
  catalog: PokemonCatalog,
  modifiers: Modifiers,
): string[] =>
  Object.entries(catalog)
    .filter(
      ([, pokemon]) =>
        modifiers.generations.includes(pokemon.generation) &&
        modifiers.formCategories.includes(pokemon.formCategory),
    )
    .map(([name]) => name);

export const shuffle = <T>(
  values: readonly T[],
  random: () => number = Math.random,
): T[] => {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [
      shuffled[target] as T,
      shuffled[index] as T,
    ];
  }

  return shuffled;
};

export const getQuestionCount = (
  availableCount: number,
  modifiers: Modifiers,
): number => {
  if (availableCount < 1) return 0;
  if (!modifiers.isLimitActive) return availableCount;
  return Math.min(Math.max(1, modifiers.limit), availableCount);
};

export const buildQuestions = (
  catalog: PokemonCatalog,
  modifiers: Modifiers,
  random: () => number = Math.random,
): QuestionData[] => {
  const pool = filterPokemon(catalog, modifiers);
  const count = getQuestionCount(pool.length, modifiers);

  return shuffle(pool, random)
    .slice(0, count)
    .map((pokemonName) => {
      const distractors = shuffle(
        pool.filter((name) => name !== pokemonName),
        random,
      ).slice(0, 3);

      return {
        pokemonName,
        options: shuffle([...distractors, pokemonName], random),
      };
    });
};

export const calculateScore = (
  correctCount: number,
  questionCount: number,
  elapsedSeconds: number,
  modifiers: Modifiers,
): number => {
  if (questionCount < 1) return 0;

  const safeSeconds = Math.max(1, elapsedSeconds);
  const accuracyPoints = correctCount ** 3 / questionCount;
  const timeMultiplier = questionCount ** 3 / safeSeconds;
  const silhouetteMultiplier = modifiers.whosThatPokemon ? correctCount : 1;
  const randomSpriteMultiplier = modifiers.randomSprite ? correctCount : 1;

  return (
    accuracyPoints *
    timeMultiplier *
    silhouetteMultiplier *
    randomSpriteMultiplier
  );
};

export const formatDuration = (elapsedSeconds: number): string => {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};

export const formatPokemonName = (name: string): string =>
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
