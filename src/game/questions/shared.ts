import { shuffle } from '../random';
import {
  statNames,
  type PokemonCatalog,
  type PokemonKnowledge,
  type PokemonOptionVisual,
  type QuestionCategory,
  type QuestionData,
  type QuestionPrompt,
} from '../types';

export interface Candidate {
  name: string;
  pokemon: PokemonKnowledge;
}

export interface QuestionContext {
  catalog: PokemonCatalog;
  pool: Candidate[];
  random: () => number;
  used: Set<string>;
}

export type QuestionBuilder = (
  context: QuestionContext,
) => QuestionData | undefined;

export const pick = <T>(
  values: readonly T[],
  random: () => number,
): T | undefined => values[Math.floor(random() * values.length)];

export const pickTarget = (
  context: QuestionContext,
  predicate: (pokemon: PokemonKnowledge) => boolean,
): Candidate | undefined => {
  const eligible = context.pool.filter(({ pokemon }) => predicate(pokemon));
  const fresh = eligible.filter(({ name }) => !context.used.has(name));
  const target = pick(fresh.length > 0 ? fresh : eligible, context.random);
  if (target) context.used.add(target.name);
  return target;
};

export const rankedOptionSet = (
  correct: string,
  candidates: readonly string[],
  score: (candidate: string) => number,
  random: () => number,
): string[] => {
  const unique = [...new Set(candidates)].filter(
    (candidate) => candidate !== correct,
  );
  const ranked = shuffle(unique, random)
    .map((candidate) => ({ candidate, score: score(candidate) }))
    .sort((left, right) => right.score - left.score)
    .map(({ candidate }) => candidate);
  return shuffle([...ranked.slice(0, 3), correct], random);
};

const evolutionStage = (pokemon: PokemonKnowledge): number => {
  if (!pokemon.evolvesFrom && pokemon.evolvesTo.length > 0) return 0;
  if (pokemon.evolvesFrom && pokemon.evolvesTo.length > 0) return 1;
  if (pokemon.evolvesFrom) return 2;
  return 3;
};

export const pokemonSimilarity = (
  target: PokemonKnowledge,
  candidate: PokemonKnowledge,
): number => {
  const sharedTypes = target.types.filter((type) =>
    candidate.types.includes(type),
  ).length;
  const targetStats = statNames.reduce(
    (total, stat) => total + target.stats[stat],
    0,
  );
  const candidateStats = statNames.reduce(
    (total, stat) => total + candidate.stats[stat],
    0,
  );

  return (
    sharedTypes * 12 +
    (target.shape === candidate.shape ? 8 : 0) +
    (target.color === candidate.color ? 5 : 0) +
    (target.generation === candidate.generation ? 4 : 0) +
    (evolutionStage(target) === evolutionStage(candidate) ? 3 : 0) +
    Math.max(0, 3 - Math.abs(targetStats - candidateStats) / 80) +
    Math.max(0, 2 - Math.abs(target.id - candidate.id) / 150)
  );
};

export const makeQuestion = (
  category: QuestionCategory,
  target: Candidate,
  correctOption: string,
  options: string[],
  prompt: QuestionPrompt,
  media: QuestionData['media'] = { kind: 'none' },
): QuestionData => ({
  answer: {
    correctOptions: [correctOption],
    interaction: 'single-choice',
  },
  category,
  id: `${category}:${target.name}`,
  media,
  options,
  pokemonName: target.name,
  prompt,
});

export const textPrompt = (text: string): QuestionPrompt => ({
  kind: 'text',
  text,
});

export const pokemonPrompt = (
  target: Candidate,
  before: string,
  after: string,
): QuestionPrompt => ({
  after,
  before,
  dexNumber: target.pokemon.id,
  kind: 'pokemon',
  name: target.name,
});

export const getOptionVisuals = (
  context: QuestionContext,
  options: readonly string[],
  getSource: (pokemon: PokemonKnowledge, option: string) => string | null = (
    pokemon,
  ) => pokemon.sprite,
  silhouette = false,
): Record<string, PokemonOptionVisual> =>
  Object.fromEntries(
    options.flatMap((option) => {
      const pokemon = context.catalog.pokemon[option];
      const src = pokemon ? getSource(pokemon, option) : null;
      return pokemon && src
        ? [[option, { dexNumber: pokemon.id, silhouette, src }] as const]
        : [];
    }),
  );

const pokemonOptionCategories: readonly QuestionCategory[] = [
  'description',
  'evolution',
  'stat',
];

const targetSpriteCategories: readonly QuestionCategory[] = [
  'type',
  'ability',
  'move',
  'matchup',
];

export const addQuestionVisuals = (
  context: QuestionContext,
  question: QuestionData,
): QuestionData => {
  if (question.optionVisuals) return question;
  if (question.media.kind !== 'none') return question;

  if (pokemonOptionCategories.includes(question.category)) {
    return {
      ...question,
      optionVisuals: getOptionVisuals(context, question.options),
    };
  }

  if (targetSpriteCategories.includes(question.category)) {
    const target = context.catalog.pokemon[question.pokemonName];
    if (target?.sprite) {
      return {
        ...question,
        media: { kind: 'pixel-sprite', src: target.sprite },
      };
    }
  }

  return question;
};

export const pokemonOptions = (
  context: QuestionContext,
  target: Candidate,
  excluded: readonly string[] = [],
  candidates: readonly Candidate[] = context.pool,
): string[] =>
  rankedOptionSet(
    target.name,
    candidates
      .filter(({ name }) => name !== target.name && !excluded.includes(name))
      .map(({ name }) => name),
    (name) => {
      const candidate = context.catalog.pokemon[name];
      return candidate ? pokemonSimilarity(target.pokemon, candidate) : 0;
    },
    context.random,
  );

export const typePlausibility = (
  context: QuestionContext,
  target: Candidate,
  type: string,
): number =>
  context.pool.reduce(
    (best, candidate) =>
      candidate.pokemon.types.includes(type)
        ? Math.max(best, pokemonSimilarity(target.pokemon, candidate.pokemon))
        : best,
    0,
  );

export const redactName = (description: string, name: string): string => {
  const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const forms = [name, name.replaceAll('-', ' ')].map(escapeRegExp);
  return description.replace(new RegExp(forms.join('|'), 'gi'), 'This Pokémon');
};
