import { createPokemonSimilarityScorer, pokemonOptions } from './answers';
import { makeQuestion } from './assembly';
import type { QuestionBuilder } from './context';
import { redactName, textPrompt } from './prompts';
import { targetRepetition } from './repetition';
import { pickTarget } from './selection';
import {
  distinctPokemon,
  makeTopicQuestion,
  orderedPokemon,
  picturedPokemon,
  pokemonSubject,
} from './topic-support';

export const buildCategory: QuestionBuilder = (context) => {
  const pool = distinctPokemon(
    orderedPokemon(
      context,
      context.pool.filter(({ pokemon }) => !!pokemon.genus),
    ),
  );
  for (const target of pool) {
    const similarity = createPokemonSimilarityScorer(target.pokemon);
    const wrong = pool
      .filter(
        ({ pokemon }) =>
          pokemon.genus !== target.pokemon.genus &&
          (!context.variant?.sameColorOrShape ||
            (!!pokemon.color && pokemon.color === target.pokemon.color) ||
            (!!pokemon.shape && pokemon.shape === target.pokemon.shape)),
      )
      .sort((a, b) =>
        context.variant?.closeAlternatives
          ? similarity(b.pokemon) - similarity(a.pokemon)
          : 0,
      )
      .slice(0, 3);
    if (wrong.length < 3) continue;
    const options = [target, ...wrong];
    return makeTopicQuestion(
      context,
      pokemonSubject(target),
      `Which is the ${target.pokemon.genus} Pokémon?`,
      target.name,
      options.map((candidate) => candidate.name),
      {
        ...picturedPokemon(context, options),
        optionReveals: Object.fromEntries(
          options.map((candidate) => [
            candidate.name,
            `${candidate.pokemon.genus} Pokémon`,
          ]),
        ),
      },
      'description',
    );
  }
};
export const buildDescriptionQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(
    context,
    ({ description, hasDistinctDescription }) =>
      Boolean(description) &&
      (!context.variant?.search || hasDistinctDescription),
  );
  if (!target) return undefined;
  return makeQuestion(context, {
    repeat: targetRepetition({ pokemonOptions: true }),
    category: 'description',
    target,
    correct: target.name,
    options: pokemonOptions(context, {
      correct: target,
      candidates: context.pool.filter(({ pokemon }) =>
        Boolean(pokemon.description),
      ),
    }),
    prompt: textPrompt(
      `“${redactName(target.pokemon.description, target.name, target.pokemon.speciesName)}”`,
    ),
    presentation: { kind: 'pokemon' },
  });
};
