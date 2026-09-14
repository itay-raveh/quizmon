import { pick } from '../../../lib/random';
import { formatGeneration } from '../../pokemon/format';
import { generations, type Generation } from '../../pokemon/types';
import { selectPokemonAnswerGroups } from './answers';
import { makeQuestion } from './assembly';
import { type QuestionBuilder } from './context';
import { textPrompt } from './prompts';
import { optionSetRepetition } from './repetition';

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
  const answers = selectPokemonAnswerGroups(context, {
    matching: pool.filter(({ pokemon }) => pokemon.generation === generation),
    others: pool.filter(({ pokemon }) => pokemon.generation !== generation),
    correctCount,
  });
  if (!answers) return undefined;
  const { target, correctOptions, options } = answers;
  return {
    ...makeQuestion(context, {
      repeat: optionSetRepetition({
        subjects: 'correct',
        variant: [generation],
      }),
      category: 'identity',
      target,
      correct: correctOptions,
      options,
      prompt: textPrompt(
        `Select every Pokémon introduced in ${formatGeneration(generation)}.`,
      ),
      presentation: { kind: 'pokemon' },
      details: { kind: 'generation' },
    }),
    visual: { kind: 'generation-roundup', generation },
  };
};
