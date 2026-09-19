import type { PokemonKnowledge } from '../../pokemon/types.ts';
import { pokemonOptions } from './answers.ts';
import { makeQuestion } from './assembly.ts';
import { type QuestionBuilder } from './context.ts';
import { redactName, textPrompt } from './prompts.ts';
import { targetRepetition } from './repetition.ts';
import { pickTarget } from './selection.ts';

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
        src: target.pokemon.sprite,
      },
      presentation: { kind: 'pokemon' },
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
        sprite: pokemon.sprite,
        dexNumber: pokemon.speciesId,
        name,
      })),
  };
};
