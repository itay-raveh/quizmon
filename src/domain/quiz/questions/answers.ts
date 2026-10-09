import type { QuestionRendering } from '../rendering.ts';
import type { PokemonDistractors, SimilarityWeights } from './family-rules.ts';
import { createSeededRandom, shuffle } from '../../../lib/random.ts';
import { type PokemonKnowledge } from '../../pokemon/types.ts';
import {
  sampledMultiCorrectCounts,
  sampledMultiCorrectWeights,
} from '../question-rules/shared.ts';
import type { Candidate, QuestionContext } from './context.ts';
import { groupPokemon } from './sampling.ts';
import { chooseTargets, distinctPokemon } from './selection.ts';

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

const shuffleDistractors = (
  correct: string,
  candidates: readonly string[],
  random: () => number,
): string[] => {
  const unique = new Set(candidates);
  unique.delete(correct);
  return shuffle([...unique], random);
};

export const randomOptionSet = (
  correct: string,
  candidates: readonly string[],
  random: () => number,
): string[] =>
  shuffle(
    [...shuffleDistractors(correct, candidates, random).slice(0, 3), correct],
    random,
  );

const rankCandidates = (
  correct: string,
  candidates: readonly string[],
  score: (candidate: string) => number,
  random: () => number,
) =>
  shuffleDistractors(correct, candidates, random)
    .map((candidate) => ({ candidate, score: score(candidate) }))
    .sort((left, right) => right.score - left.score);

const evolutionStage = (pokemon: PokemonKnowledge): number => {
  if (!pokemon.evolvesFrom && pokemon.evolvesTo.length > 0) return 0;
  if (pokemon.evolvesFrom && pokemon.evolvesTo.length > 0) return 1;
  if (pokemon.evolvesFrom) return 2;
  return 3;
};

const relativeSimilarity = (
  left: number | undefined,
  right: number | undefined,
): number =>
  left && right && left > 0 && right > 0
    ? Math.min(left, right) / Math.max(left, right)
    : 0;

const frontReferenceProportion = (
  pokemon: PokemonKnowledge,
): number | undefined => {
  const bounds = pokemon.spriteMeasurements;
  return bounds && bounds[1] > 0 && bounds[2] > 0
    ? bounds[1] / bounds[2]
    : undefined;
};

export const createPokemonSimilarityScorer = (
  target: PokemonKnowledge,
  weights: SimilarityWeights,
): ((candidate: PokemonKnowledge) => number) => {
  const targetStage = evolutionStage(target);
  const targetProportion = frontReferenceProportion(target);
  return (candidate) => {
    const sharedTypes = target.types.filter((type) =>
      candidate.types.includes(type),
    ).length;
    const typeCount = new Set([...target.types, ...candidate.types]).size;
    return (
      (typeCount ? sharedTypes / typeCount : 0) * weights.type +
      (target.shape === candidate.shape ? weights.shape : 0) +
      (target.color === candidate.color ? weights.color : 0) +
      (targetStage === evolutionStage(candidate) ? weights.evolutionStage : 0) +
      relativeSimilarity(
        targetProportion,
        frontReferenceProportion(candidate),
      ) *
        weights.proportions +
      relativeSimilarity(target.height, candidate.height) * weights.height
    );
  };
};

export const pokemonOptions = (
  context: QuestionContext<
    PokemonDistractors & {
      rendering?: QuestionRendering;
      response?: { kind: string };
    }
  > & {
    variant: PokemonDistractors & {
      rendering?: QuestionRendering;
      response?: { kind: string };
    };
  },
  {
    correct: target,
    excluded = [],
    candidates = context.pool,
  }: {
    correct: Candidate;
    excluded?: readonly string[];
    candidates?: readonly Candidate[];
  },
): string[] => {
  const variant = context.variant;
  if (variant.response?.kind === 'search') return [target.name];
  const similarityToTarget = createPokemonSimilarityScorer(
    target.pokemon,
    variant.rendering?.[variant.similarityRole ?? 'subject'].sprite?.silhouette
      ? { ...variant.similarityWeights, ...variant.silhouetteWeights, color: 0 }
      : variant.similarityWeights,
  );
  const similarityFor = (name: string) => {
    const candidate = context.catalog.pokemon[name];
    return candidate ? similarityToTarget(candidate) : 0;
  };
  const scored = groupPokemon(
    rankCandidates(
      target.name,
      candidates
        .filter(
          (candidate) =>
            !excluded.includes(candidate.name) &&
            (variant.allowEvolutionRelatives ||
              candidate.pokemon.evolutionFamily !==
                target.pokemon.evolutionFamily) &&
            distinctPokemon([candidate], (value) => value, [target]).length > 0,
        )
        .map(({ name }) => name),
      similarityFor,
      context.random,
    ).map(({ candidate }) => ({
      name: candidate,
      pokemon: context.catalog.pokemon[candidate]!,
    })),
  );
  if (variant.distractorRankDirection === 'least-similar') scored.reverse();
  const shortlistSize = Math.max(3, Math.floor(variant.distractorPoolSize));
  let shortlisted = scored.slice(0, shortlistSize);
  if (
    variant.smallPoolPolicy === 'semantic-band' &&
    scored.length < shortlistSize &&
    variant.distractorRankDirection !== 'least-similar'
  ) {
    const bestScore = scored[0]?.[0]
      ? similarityFor(scored[0][0].name)
      : similarityFor('');
    const semanticBand = scored.filter(
      (group) =>
        similarityFor(group[0]!.name) >=
        bestScore * variant.smallPoolSimilarityRatio,
    );
    shortlisted = semanticBand.length >= 3 ? semanticBand : scored.slice(0, 3);
  }
  const shortlist = shortlisted.flat();
  const optionRandom = createSeededRandom([
    target.name,
    ...Array.from({ length: Math.min(3, scored.length) }, () =>
      context.random(),
    ),
  ]);
  const optionContext = { ...context, random: optionRandom };
  const selected = chooseTargets(optionContext, shortlist, 3, [target], false);
  for (const group of scored) {
    if (selected.length === 3) break;
    selected.push(
      ...chooseTargets(optionContext, group, 1, [target, ...selected], false),
    );
  }
  const distanceFromTarget = (group: Candidate[]) =>
    Math.abs(group[0]!.pokemon.speciesId - target.pokemon.speciesId);
  const spreadBand = [...shortlisted]
    .sort((left, right) => distanceFromTarget(right) - distanceFromTarget(left))
    .slice(0, Math.ceil(shortlisted.length * variant.distantSpeciesFraction))
    .flat();
  const spreadSpecies = new Set(
    spreadBand.map(({ pokemon }) => pokemon.speciesId),
  );

  if (
    selected.length === 3 &&
    !selected.some(({ pokemon }) => spreadSpecies.has(pokemon.speciesId))
  ) {
    const closestIndex = selected.reduce(
      (closest, candidate, index) =>
        distanceFromTarget([candidate]) <
        distanceFromTarget([selected[closest]!])
          ? index
          : closest,
      0,
    );
    const replacement = chooseTargets(
      optionContext,
      spreadBand,
      1,
      [target, ...selected.filter((_, index) => index !== closestIndex)],
      false,
    )[0];
    if (replacement) selected[closestIndex] = replacement;
  }

  return shuffle(
    [...selected.map(({ name }) => name), target.name],
    optionRandom,
  );
};

export const selectPokemonAnswerGroups = (
  context: QuestionContext,
  {
    matching,
    others,
    correctCount,
  }: {
    matching: readonly Candidate[];
    others: readonly Candidate[];
    correctCount: number;
  },
) => {
  const correct = chooseTargets(context, matching, correctCount);
  const distractors = chooseTargets(context, others, 4 - correctCount, correct);
  const target = correct[0];
  if (
    !target ||
    correct.length !== correctCount ||
    distractors.length !== 4 - correctCount
  )
    return undefined;
  const correctOptions = correct.map(({ name }) => name);
  const options = shuffle(
    [...correctOptions, ...distractors.map(({ name }) => name)],
    context.random,
  );
  return { target, correctOptions, options };
};

export const eligibleSampledMultiCorrectCounts = (
  matchingCount: number,
  otherCount: number,
) =>
  sampledMultiCorrectCounts.filter(
    (count) => matchingCount >= count && otherCount >= 4 - count,
  );

export const chooseSampledMultiCorrectCount = (
  context: QuestionContext,
  matchingCount: number,
  otherCount: number,
) => {
  const counts = eligibleSampledMultiCorrectCounts(matchingCount, otherCount);
  let draw =
    context.random() *
    counts.reduce((sum, count) => sum + sampledMultiCorrectWeights[count], 0);
  for (const count of counts) {
    draw -= sampledMultiCorrectWeights[count];
    if (draw < 0) return count;
  }
  return undefined;
};
