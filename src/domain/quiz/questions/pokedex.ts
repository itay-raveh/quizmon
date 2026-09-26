import type { FamilyRules } from './family-rules.ts';
import { createPokemonSimilarityScorer, pokemonOptions } from './answers.ts';
import { makeQuestion } from './assembly.ts';
import type { QuestionBuilder } from './context.ts';
import { redactName, textPrompt, unambiguousDescriptions } from './prompts.ts';
import { targetRepetition } from './repetition.ts';
import { pickFreshTarget } from './selection.ts';
import {
  distinctPokemon,
  makeTopicQuestion,
  orderedPokemon,
  picturedPokemon,
  pokemonSubject,
} from './topic-support.ts';

export const buildCategory: QuestionBuilder<
  FamilyRules['pokedex-categories']
> = (context) => {
  const pool = distinctPokemon(
    orderedPokemon(
      context,
      context.pool.filter(({ pokemon }) => !!pokemon.genus),
    ),
  );
  for (const target of pool) {
    const similarity = createPokemonSimilarityScorer(
      target.pokemon,
      context.variant.similarityWeights,
    );
    const wrong = pool
      .filter(
        ({ pokemon }) =>
          pokemon.genus !== target.pokemon.genus &&
          (!context.variant.sameColorOrShape ||
            (!!pokemon.color && pokemon.color === target.pokemon.color) ||
            (!!pokemon.shape && pokemon.shape === target.pokemon.shape)),
      )
      .sort((a, b) =>
        context.variant.closeAlternatives
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
export const buildDescriptionQuestion: QuestionBuilder<
  FamilyRules['field-notes']
> = (context) => {
  const eligible = unambiguousDescriptions(
    context.pool.filter(
      ({ pokemon }) =>
        context.variant.response.kind !== 'search' ||
        pokemon.hasDistinctDescription,
    ),
  );
  const target = pickFreshTarget(context, eligible);
  if (!target) return undefined;
  return makeQuestion(context, {
    repeat: targetRepetition({ pokemonOptions: true }),
    category: 'description',
    target,
    correct: target.name,
    options: pokemonOptions(context, {
      correct: target,
      candidates: eligible,
    }),
    prompt: textPrompt(
      `“${redactName(target.pokemon.description, target.name, target.pokemon.speciesName)}”`,
    ),
    presentation: { kind: 'pokemon' },
  });
};
