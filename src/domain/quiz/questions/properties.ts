import { pick, shuffle } from '../../../lib/random';
import { randomOptionSet } from './answers';
import { makeQuestion, targetMedia } from './assembly';
import { type QuestionBuilder } from './context';
import { pokemonPrompt } from './prompts';
import { targetRepetition } from './repetition';
import { pickTarget } from './selection';

export const buildPropertyQuestion = (
  category: 'ability' | 'move',
): QuestionBuilder => {
  const property = category === 'ability' ? 'abilities' : 'levelMoves';
  const subject = category === 'ability' ? 'ability' : 'move by leveling up';
  return (context) => {
    const target = pickTarget(
      context,
      (pokemon) => pokemon[property].length > 0,
    );
    if (!target) return undefined;
    const correct = pick(target.pokemon[property], context.random);
    if (!correct) return undefined;
    const candidates = new Set(
      context.pool.flatMap(({ pokemon }) => pokemon[property]),
    );
    for (const invalid of target.pokemon[property]) candidates.delete(invalid);
    const preferred = context.variant?.plausibleProperties
      ? new Set(
          context.pool
            .filter(({ pokemon }) =>
              pokemon.types.some((type) => target.pokemon.types.includes(type)),
            )
            .flatMap(({ pokemon }) => pokemon[property])
            .filter((value) => candidates.has(value)),
        )
      : new Set<string>();
    const options = context.variant?.plausibleProperties
      ? shuffle(
          [
            correct,
            ...shuffle([...preferred], context.random)
              .concat(
                shuffle(
                  [...candidates].filter((value) => !preferred.has(value)),
                  context.random,
                ),
              )
              .slice(0, 3),
          ],
          context.random,
        )
      : randomOptionSet(correct, [...candidates], context.random);
    return makeQuestion(context, {
      repeat: targetRepetition({ pokemonOptions: false }),
      category,
      target,
      correct,
      options,
      prompt: pokemonPrompt(target, `Which ${subject} can `, ' have?'),
      presentation: { kind: 'text' },
      media: targetMedia(target),
    });
  };
};
