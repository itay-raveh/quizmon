import { targetRepetition, optionSetRepetition } from './repetition';
import { formatGeneration, formatPokemonName } from '../format';
import { pick, shuffle } from '../random';
import { generations, type Generation } from '../types';
import {
  chooseTargets,
  pickFreshTarget,
  getOptionVisuals,
  makeQuestion,
  pokemonOptions,
  textPrompt,
  type QuestionBuilder,
} from './shared';

export const buildGenerationRoundupQuestion: QuestionBuilder = (context) => {
  const pool = context.pool.filter(({ pokemon }) => pokemon.sprite);
  const correctCount = context.random() < 0.5 ? 2 : 3;
  const generationCounts = new Map<Generation, number>();
  for (const { pokemon } of pool) {
    generationCounts.set(
      pokemon.generation,
      (generationCounts.get(pokemon.generation) ?? 0) + 1,
    );
  }
  const generation = pick(
    generations.filter((generation) => {
      const matchingCount = generationCounts.get(generation) ?? 0;
      return (
        matchingCount >= correctCount &&
        pool.length - matchingCount >= 4 - correctCount
      );
    }),
    context.random,
  );
  if (!generation) return undefined;
  const matching = chooseTargets(
    context,
    pool.filter(({ pokemon }) => pokemon.generation === generation),
    correctCount,
  );
  const others = chooseTargets(
    context,
    pool.filter(({ pokemon }) => pokemon.generation !== generation),
    4 - correctCount,
  );
  const target = matching[0];
  if (!target) return undefined;
  context.used.add(target.name);
  const correctOptions = matching.map(({ name }) => name);
  const options = shuffle(
    [...correctOptions, ...others.map(({ name }) => name)],
    context.random,
  );
  return {
    ...makeQuestion(
      optionSetRepetition({ subjects: 'correct', variant: [generation] }),
      'identity',
      target,
      correctOptions,
      options,
      textPrompt(
        `Select every Pokémon introduced in ${formatGeneration(generation)}.`,
      ),
    ),
    visual: { kind: 'generation-roundup', generation },
    optionGenerations: Object.fromEntries(
      [...matching, ...others].map(({ name, pokemon }) => [
        name,
        pokemon.generation,
      ]),
    ),
    optionVisuals: getOptionVisuals(context, options),
  };
};

const regionalForm = (name: string): string | undefined =>
  name.match(/-(alola|galar|hisui|paldea)(?:-|$)/)?.[1];

export const buildEvolutionLinkQuestion: QuestionBuilder = (context) => {
  const poolNames = new Set(context.pool.map(({ name }) => name));
  const middleStages = context.pool.filter(
    ({ pokemon }) => pokemon.evolvesFrom && pokemon.evolvesTo.length > 0,
  );
  const regions = new Map(
    middleStages.map(({ name }) => [name, regionalForm(name)]),
  );
  const chains = middleStages.flatMap((target) => {
    const { name, pokemon } = target;
    const before = pokemon.evolvesFrom;
    const after = pokemon.evolvesTo[0];
    if (
      !before ||
      !after ||
      pokemon.evolvesTo.length !== 1 ||
      !poolNames.has(before) ||
      !poolNames.has(after)
    )
      return [];
    const first = context.catalog.pokemon[before];
    const last = context.catalog.pokemon[after];
    if (
      !first ||
      !last ||
      first.evolvesFrom ||
      last.evolvesTo.length > 0 ||
      !first.evolvesTo.includes(name) ||
      last.evolvesFrom !== name
    )
      return [];
    const region = regions.get(name);
    const possibleAnswers = middleStages.filter(
      ({ name: option, pokemon: candidate }) =>
        option !== before &&
        option !== after &&
        candidate.speciesName !== pokemon.speciesName &&
        regions.get(option) === region,
    );
    if (possibleAnswers.length < 3) return [];
    return [{ target, before, after, possibleAnswers }];
  });
  const fresh = chains.filter(({ target }) => !context.used.has(target.name));
  const selected =
    context.history || context.rotation !== undefined
      ? pickFreshTarget(
          context,
          chains.map(({ target }) => target),
        )
      : undefined;
  const chain = selected
    ? chains.find(({ target }) => target === selected)
    : pick(fresh.length > 0 ? fresh : chains, context.random);
  if (!chain) return undefined;
  const { target, before, after, possibleAnswers } = chain;
  context.used.add(target.name);
  return {
    ...makeQuestion(
      targetRepetition({ pokemonOptions: true, related: [before, after] }),
      'evolution',
      target,
      target.name,
      pokemonOptions(context, target, [before, after], possibleAnswers),
      textPrompt(
        `Complete the evolution chain: ${formatPokemonName(before)} → ? → ${formatPokemonName(after)}.`,
      ),
    ),
    visual: {
      kind: 'evolution-link',
      before,
      after,
      stages: getOptionVisuals(context, [before, target.name, after]),
    },
  };
};
