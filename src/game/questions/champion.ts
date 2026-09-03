import { formatPokemonName } from '../format';
import {
  makeQuestion,
  pickTarget,
  pokemonOptions,
  redactName,
  textPrompt,
  type QuestionBuilder,
} from './shared';

export const buildChampionQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ description, genus, sprite, types }) =>
    Boolean(description && genus && sprite && types.length > 0),
  );
  if (!target?.pokemon.sprite) return undefined;
  return {
    ...makeQuestion(
      'champion',
      target,
      target.name,
      pokemonOptions(context, target),
      textPrompt('Name the Pokémon. Reveal fewer clues to earn more points.'),
      {
        kind: 'sprite',
        revealAt: 5,
        silhouette: true,
        src: target.pokemon.sprite,
      },
    ),
    clues: [
      redactName(target.pokemon.description, target.name),
      `Known as the ${target.pokemon.genus} Pokémon.`,
      `${target.pokemon.types.map(formatPokemonName).join(' / ')} type, introduced in Generation ${target.pokemon.generation}.`,
      `National Pokédex number #${target.pokemon.id}.`,
    ],
    searchOptions: context.pool.map(({ name }) => name),
  };
};
