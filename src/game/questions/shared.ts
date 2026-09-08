import { createSeededRandom, shuffle } from '../random';
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

export type QuestionDraft = Omit<QuestionData, 'generation' | 'questionType'>;

export type QuestionBuilder = (
  context: QuestionContext,
) => QuestionDraft | undefined;

export const pick = <T>(
  values: readonly T[],
  random: () => number,
): T | undefined => values[Math.floor(random() * values.length)];

export const pickFreshTarget = (
  context: QuestionContext,
  candidates: readonly Candidate[],
): Candidate | undefined => {
  const fresh = candidates.filter(({ name }) => !context.used.has(name));
  return pick(fresh.length > 0 ? fresh : candidates, context.random);
};

export const pickTarget = (
  context: QuestionContext,
  predicate: (pokemon: PokemonKnowledge) => boolean,
): Candidate | undefined => {
  const eligible = context.pool.filter(({ pokemon }) => predicate(pokemon));
  const target = pickFreshTarget(context, eligible);
  if (target) context.used.add(target.name);
  return target;
};

export const rankedOptionSet = (
  correct: string,
  candidates: readonly string[],
  score: (candidate: string) => number,
  random: () => number,
): string[] => {
  const ranked = rankCandidates(correct, candidates, score, random);
  return shuffle(
    [...ranked.slice(0, 3).map(({ candidate }) => candidate), correct],
    random,
  );
};

export const randomOptionSet = (
  correct: string,
  candidates: readonly string[],
  random: () => number,
): string[] => {
  const unique = [...new Set(candidates)].filter(
    (candidate) => candidate !== correct,
  );
  return shuffle([...shuffle(unique, random).slice(0, 3), correct], random);
};

const rankCandidates = (
  correct: string,
  candidates: readonly string[],
  score: (candidate: string) => number,
  random: () => number,
) => {
  const unique = [...new Set(candidates)].filter(
    (candidate) => candidate !== correct,
  );
  return shuffle(unique, random)
    .map((candidate) => ({ candidate, score: score(candidate) }))
    .sort((left, right) => right.score - left.score);
};

const evolutionStage = (pokemon: PokemonKnowledge): number => {
  if (!pokemon.evolvesFrom && pokemon.evolvesTo.length > 0) return 0;
  if (pokemon.evolvesFrom && pokemon.evolvesTo.length > 0) return 1;
  if (pokemon.evolvesFrom) return 2;
  return 3;
};

export const createPokemonSimilarityScorer = (
  target: PokemonKnowledge,
): ((candidate: PokemonKnowledge) => number) => {
  const targetStats = statNames.reduce(
    (total, stat) => total + target.stats[stat],
    0,
  );
  const targetStage = evolutionStage(target);

  return (candidate) => {
    const sharedTypes = target.types.filter((type) =>
      candidate.types.includes(type),
    ).length;
    const candidateStats = statNames.reduce(
      (total, stat) => total + candidate.stats[stat],
      0,
    );

    return (
      sharedTypes * 12 +
      (target.shape === candidate.shape ? 8 : 0) +
      (target.color === candidate.color ? 5 : 0) +
      (target.generation === candidate.generation ? 4 : 0) +
      (targetStage === evolutionStage(candidate) ? 3 : 0) +
      Math.max(0, 3 - Math.abs(targetStats - candidateStats) / 80)
    );
  };
};

export const makeQuestion = (
  category: QuestionCategory,
  target: Candidate,
  correct: string | string[],
  options: string[],
  prompt: QuestionPrompt,
  media: QuestionDraft['media'] = { kind: 'none' },
): QuestionDraft => ({
  answer: {
    correctOptions: typeof correct === 'string' ? [correct] : correct,
    interaction: typeof correct === 'string' ? 'single-choice' : 'multi-select',
  },
  category,
  id: `${category}:${target.name}`,
  media,
  options,
  pokemonName: target.name,
  pokemonTypes: target.pokemon.types,
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
        ? [
            [
              option,
              { dexNumber: pokemon.id, silhouette, src, types: pokemon.types },
            ] as const,
          ]
        : [];
    }),
  );

const getOptionDexNumbers = (
  context: QuestionContext,
  options: readonly string[],
): Record<string, number> =>
  Object.fromEntries(
    options.flatMap((option) => {
      const pokemon = context.catalog.pokemon[option];
      return pokemon ? [[option, pokemon.id] as const] : [];
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
  question: QuestionDraft,
): QuestionDraft => {
  if (question.visual?.kind === 'evolution-link' || question.optionGenerations)
    return question;
  const detectedDexNumbers = getOptionDexNumbers(context, question.options);
  const optionDexNumbers = {
    ...question.optionDexNumbers,
    ...detectedDexNumbers,
  };
  const preparedQuestion =
    Object.keys(optionDexNumbers).length > 0
      ? { ...question, optionDexNumbers }
      : question;

  if (preparedQuestion.optionVisuals) return preparedQuestion;
  if (preparedQuestion.media.kind !== 'none') return preparedQuestion;

  if (pokemonOptionCategories.includes(preparedQuestion.category)) {
    return {
      ...preparedQuestion,
      optionVisuals: getOptionVisuals(context, preparedQuestion.options),
    };
  }

  if (targetSpriteCategories.includes(preparedQuestion.category)) {
    const target = context.catalog.pokemon[preparedQuestion.pokemonName];
    if (target?.sprite) {
      return {
        ...preparedQuestion,
        media: { kind: 'pixel-sprite', src: target.sprite },
      };
    }
  }

  return preparedQuestion;
};

export const pokemonOptions = (
  context: QuestionContext,
  target: Candidate,
  excluded: readonly string[] = [],
  candidates: readonly Candidate[] = context.pool,
): string[] => {
  const similarityToTarget = createPokemonSimilarityScorer(target.pokemon);
  const similarityFor = (name: string) => {
    const candidate = context.catalog.pokemon[name];
    return candidate ? similarityToTarget(candidate) : 0;
  };
  const scored = rankCandidates(
    target.name,
    candidates
      .filter(({ name }) => name !== target.name && !excluded.includes(name))
      .map(({ name }) => name),
    similarityFor,
    context.random,
  );
  let shortlisted = scored.slice(0, 15);
  if (scored.length < 15) {
    const bestScore = scored[0]?.score ?? similarityFor('');
    const semanticBand = scored.filter(({ score }) => score >= bestScore * 0.6);
    shortlisted = semanticBand.length >= 3 ? semanticBand : scored.slice(0, 3);
  }
  const shortlist = shortlisted.map(({ candidate }) => candidate);
  const optionRandom = createSeededRandom(
    [
      target.name,
      ...Array.from({ length: Math.min(3, scored.length) }, () =>
        context.random().toString(36),
      ),
    ].join(':'),
  );
  const selected = shuffle(shortlist, optionRandom).slice(0, 3);
  const distanceFromTarget = (name: string) =>
    Math.abs(
      (context.catalog.pokemon[name]?.id ?? target.pokemon.id) -
        target.pokemon.id,
    );
  const spreadBand = [...shortlist]
    .sort((left, right) => distanceFromTarget(right) - distanceFromTarget(left))
    .slice(0, Math.ceil(shortlist.length / 3));

  if (
    selected.length === 3 &&
    !selected.some((name) => spreadBand.includes(name))
  ) {
    const spreadCandidate = pick(spreadBand, optionRandom);
    if (spreadCandidate) {
      const closestIndex = selected.reduce(
        (closest, name, index) =>
          distanceFromTarget(name) < distanceFromTarget(selected[closest] ?? '')
            ? index
            : closest,
        0,
      );
      selected[closestIndex] = spreadCandidate;
    }
  }

  return shuffle([...selected, target.name], optionRandom);
};

export const redactName = (description: string, name: string): string => {
  const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const forms = [name, name.replaceAll('-', ' ')].map(escapeRegExp);
  return description.replace(new RegExp(forms.join('|'), 'gi'), 'This Pokémon');
};
