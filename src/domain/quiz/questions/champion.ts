import type { PokemonKnowledge } from '../../pokemon/types';
import { pokemonOptions } from './answers';
import { makeQuestion } from './assembly';
import { type QuestionBuilder } from './context';
import { redactName, textPrompt } from './prompts';
import { targetRepetition } from './repetition';
import { pickTarget } from './selection';

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
    ...makeQuestion(context, {
      repeat: targetRepetition({ pokemonOptions: true }),
      category: 'champion',
      target,
      correct: target.name,
      options: pokemonOptions(context, { correct: target }),
      prompt: textPrompt(`“${openingClue}”`),
      media: {
        kind: 'sprite',
        revealAt: 4,
        silhouette: true,
        src: target.pokemon.sprite,
      },
      presentation: { kind: 'pokemon-names' },
    }),
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
