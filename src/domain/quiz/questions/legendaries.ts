import { pick } from '../../../lib/random';
import { selectPokemonAnswerGroups } from './answers';
import { makeQuestion } from './assembly';
import { type QuestionBuilder } from './context';
import { textPrompt } from './prompts';
import { optionSetRepetition } from './repetition';

export const buildLegendHuntQuestion: QuestionBuilder = (context) => {
  const pool = context.pool.filter(({ pokemon }) => pokemon.sprite);
  const matching = pool.filter(
    ({ pokemon }) => pokemon.isLegendary || pokemon.isMythical,
  );
  const others = pool.filter(
    ({ pokemon }) => !pokemon.isLegendary && !pokemon.isMythical,
  );
  const correctCount = pick(
    [2, 3].filter(
      (count) => matching.length >= count && others.length >= 4 - count,
    ),
    context.random,
  );
  if (!correctCount) return undefined;
  const answers = selectPokemonAnswerGroups(context, {
    matching,
    others,
    correctCount,
  });
  if (!answers) return undefined;
  const { target, correctOptions, options } = answers;
  return makeQuestion(context, {
    repeat: optionSetRepetition({ subjects: 'correct' }),
    category: 'identity',
    target,
    correct: correctOptions,
    options,
    prompt: textPrompt('Select every Legendary or Mythical Pokémon.'),
    presentation: { kind: 'pokemon' },
    details: { kind: 'classification' },
  });
};
