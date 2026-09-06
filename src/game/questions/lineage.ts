import { formatPokemonName } from '../format';
import { shuffle } from '../random';
import { generations } from '../types';
import {
  getOptionVisuals,
  makeQuestion,
  pick,
  pokemonOptions,
  textPrompt,
  type QuestionBuilder,
} from './shared';

export const buildGenerationRoundupQuestion: QuestionBuilder = (context) => {
  const pool = context.pool.filter(({ pokemon }) => pokemon.sprite);
  const correctCount = context.random() < 0.5 ? 2 : 3;
  const generation = pick(
    generations.filter((generation) => {
      const matchingCount = pool.filter(
        ({ pokemon }) => pokemon.generation === generation,
      ).length;
      return (
        matchingCount >= correctCount &&
        pool.length - matchingCount >= 4 - correctCount
      );
    }),
    context.random,
  );
  if (!generation) return undefined;
  const matching = shuffle(
    pool.filter(({ pokemon }) => pokemon.generation === generation),
    context.random,
  ).slice(0, correctCount);
  const others = shuffle(
    pool.filter(({ pokemon }) => pokemon.generation !== generation),
    context.random,
  ).slice(0, 4 - correctCount);
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
      'identity',
      target,
      target.name,
      options,
      textPrompt(
        `Select every Pokémon introduced in Generation ${generation}.`,
      ),
    ),
    title: 'Generation roundup',
    visual: { kind: 'generation-roundup', generation },
    answer: { correctOptions, interaction: 'multi-select' },
    optionGenerations: Object.fromEntries(
      [...matching, ...others].map(({ name, pokemon }) => [
        name,
        pokemon.generation,
      ]),
    ),
    optionVisuals: getOptionVisuals(context, options),
  };
};

export const buildEvolutionLinkQuestion: QuestionBuilder = (context) => {
  const poolNames = new Set(context.pool.map(({ name }) => name));
  const middleStages = context.pool.filter(
    ({ pokemon }) => pokemon.evolvesFrom && pokemon.evolvesTo.length > 0,
  );
  const chains = middleStages.flatMap((target) => {
    const { name, pokemon } = target;
    // Species-only links cannot identify the required regional forms.
    // https://github.com/PokeAPI/pokeapi/issues/724
    if (name === 'linoone' || name === 'mr-mime') return [];
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
    const possibleAnswers = middleStages.filter(
      ({ name: option }) => option !== before && option !== after,
    );
    if (possibleAnswers.length < 4) return [];
    return [{ target, before, after, possibleAnswers }];
  });
  const fresh = chains.filter(({ target }) => !context.used.has(target.name));
  const chain = pick(fresh.length > 0 ? fresh : chains, context.random);
  if (!chain) return undefined;
  const { target, before, after, possibleAnswers } = chain;
  context.used.add(target.name);
  return {
    ...makeQuestion(
      'evolution',
      target,
      target.name,
      pokemonOptions(context, target, [before, after], possibleAnswers),
      textPrompt(
        `Complete the evolution chain: ${formatPokemonName(before)} → ? → ${formatPokemonName(after)}.`,
      ),
    ),
    title: 'Evolution link',
    visual: {
      kind: 'evolution-link',
      before,
      after,
      stages: getOptionVisuals(context, [before, target.name, after]),
    },
  };
};
