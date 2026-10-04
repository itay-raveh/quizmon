import { pick } from '../../../lib/random.ts';
import { formatGeneration } from '../../pokemon/format.ts';
import { generations, type Generation } from '../../pokemon/types.ts';
import {
  chooseSampledMultiCorrectCount,
  eligibleSampledMultiCorrectCounts,
  selectPokemonAnswerGroups,
} from './answers.ts';
import { makeQuestion } from './assembly.ts';
import { type QuestionBuilder } from './context.ts';
import { textPrompt } from './prompts.ts';
import { optionSetRepetition } from './repetition.ts';

export const buildGenerationRoundupQuestion: QuestionBuilder = (context) => {
  const pool = context.pool.filter(({ pokemon }) => pokemon.sprite);
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
        eligibleSampledMultiCorrectCounts(
          matchingCount,
          pool.length - matchingCount,
        ).length > 0
      );
    }),
    context.random,
  );
  if (!generation) return undefined;
  const correctCount = chooseSampledMultiCorrectCount(
    context,
    generationCounts.get(generation) ?? 0,
    pool.length - (generationCounts.get(generation) ?? 0),
  );
  if (correctCount === undefined) return undefined;
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
    visual: { kind: 'pokemonByGeneration', generation },
  };
};
