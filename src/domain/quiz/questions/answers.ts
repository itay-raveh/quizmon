import { createSeededRandom, shuffle } from '../../../lib/random.ts';
import { questionTuning, type VariantRules } from '../question-variants.ts';
import { statNames, type PokemonKnowledge } from '../../pokemon/types.ts';
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

const totalStats = (pokemon: PokemonKnowledge): number =>
  statNames.reduce((total, stat) => total + pokemon.stats[stat], 0);

export const createPokemonSimilarityScorer = (
  target: PokemonKnowledge,
  weightOverrides?: VariantRules['similarityWeights'],
): ((candidate: PokemonKnowledge) => number) => {
  const weights = { ...questionTuning.similarity, ...weightOverrides };
  const targetStats = totalStats(target);
  const targetStage = evolutionStage(target);

  return (candidate) => {
    const sharedTypes = target.types.filter((type) =>
      candidate.types.includes(type),
    ).length;
    const candidateStats = totalStats(candidate);

    return (
      sharedTypes * weights.sharedType +
      (target.shape === candidate.shape ? weights.shape : 0) +
      (target.color === candidate.color ? weights.color : 0) +
      (target.generation === candidate.generation ? weights.generation : 0) +
      (targetStage === evolutionStage(candidate) ? weights.evolutionStage : 0) +
      Math.max(
        0,
        weights.statMaximum -
          Math.abs(targetStats - candidateStats) / weights.statScale,
      )
    );
  };
};

export const pokemonOptions = (
  context: QuestionContext,
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
  const similarityToTarget = createPokemonSimilarityScorer(
    target.pokemon,
    context.variant?.similarityWeights,
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
  if (context.variant?.distractorRankDirection === -1) scored.reverse();
  const shortlistSize = Math.max(
    3,
    Math.floor(
      context.variant?.distractorPoolSize ?? questionTuning.distractorPoolSize,
    ),
  );
  let shortlisted = scored.slice(0, shortlistSize);
  if (
    context.variant?.distractorPoolSize === undefined &&
    scored.length < shortlistSize &&
    context.variant?.distractorRankDirection !== -1
  ) {
    const bestScore = scored[0]?.[0]
      ? similarityFor(scored[0][0].name)
      : similarityFor('');
    const semanticBand = scored.filter(
      (group) =>
        similarityFor(group[0]!.name) >=
        bestScore *
          (context.variant?.smallPoolSimilarityRatio ??
            questionTuning.smallPoolSimilarityRatio),
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
    .slice(
      0,
      Math.ceil(
        shortlisted.length *
          (context.variant?.distantSpeciesFraction ??
            questionTuning.distantSpeciesFraction),
      ),
    )
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
