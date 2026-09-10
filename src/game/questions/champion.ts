import type { PokemonKnowledge } from '../types';
import { targetRepetition } from './repetition';
import {
  makeQuestion,
  pickTarget,
  pokemonOptions,
  redactName,
  textPrompt,
  type QuestionBuilder,
} from './shared';

const canIdentify = ({
  description,
  hasDistinctDescription,
  genus,
  sprite,
  types,
}: PokemonKnowledge) =>
  Boolean(
    description &&
    hasDistinctDescription &&
    genus &&
    sprite &&
    types.length > 0,
  );

export const buildChampionQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, canIdentify);
  if (!target?.pokemon.sprite) return undefined;
  const openingClue = redactName(
    target.pokemon.description,
    target.name,
    target.pokemon.speciesName,
  );

  return {
    ...makeQuestion(
      targetRepetition({ pokemonOptions: true }),
      'champion',
      target,
      target.name,
      pokemonOptions(context, target),
      textPrompt(`“${openingClue}”`),
      {
        kind: 'sprite',
        revealAt: 4,
        silhouette: true,
        src: target.pokemon.sprite,
      },
    ),
    clues: [
      `Known as the ${target.pokemon.genus} Pokémon.`,
      {
        kind: 'generation',
        generation: target.pokemon.generation,
        types: target.pokemon.types,
      },
      `National Pokédex number #${target.pokemon.speciesId}.`,
    ],
    searchOptions: context.pool
      .filter(
        ({ name, pokemon }) =>
          canIdentify(pokemon) &&
          (name === target.name ||
            pokemon.speciesName !== target.pokemon.speciesName),
      )
      .map(({ name, pokemon }) => ({
        dexNumber: pokemon.speciesId,
        name,
      })),
  };
};
