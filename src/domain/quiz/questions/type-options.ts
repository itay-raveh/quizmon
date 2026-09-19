import { createPokemonSimilarityScorer, rankedOptionSet } from './answers.ts';
import { type Candidate, type QuestionContext } from './context.ts';

export const typeOptions = (
  context: QuestionContext,
  target: Candidate,
  correct: string,
): string[] => {
  const similarityToTarget = createPokemonSimilarityScorer(target.pokemon);
  const bestScores = new Map<string, number>();
  for (const { pokemon } of context.pool) {
    const score = similarityToTarget(pokemon);
    for (const type of pokemon.types) {
      bestScores.set(type, Math.max(bestScores.get(type) ?? 0, score));
    }
  }
  return rankedOptionSet(
    correct,
    Object.keys(context.catalog.typeRelations).filter(
      (type) => !target.pokemon.types.includes(type),
    ),
    (type) => bestScores.get(type) ?? 0,
    context.random,
  );
};
