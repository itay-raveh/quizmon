import { getPokemonRecency, getSubjectRecency } from '../question-history';
import { createSeededRandom } from '../random';
import type { PokemonKnowledge } from '../types';
import type { Candidate, QuestionContext } from './context';
import { pickPokemon, pokemonWeight, shufflePokemon } from './sampling';

export const orderTargets = (
  context: QuestionContext,
  candidates: readonly Candidate[],
): Candidate[] => {
  const compareUsed = (a: Candidate, b: Candidate) =>
    Number(context.used.has(a.name)) - Number(context.used.has(b.name));
  if (context.rotation !== undefined) {
    const random = createSeededRandom(
      `question-rotation-v2:${context.questionType}`,
    );
    const deck = [...candidates]
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .flatMap((candidate) => {
        const tickets = pokemonWeight(candidate.name);
        // Space each Pokémon’s rotation slots to avoid clustering repeats.
        const phase = random();
        return Array.from({ length: tickets }, (_, index) => ({
          candidate,
          position: (index + phase) / tickets,
        }));
      })
      .sort((a, b) => a.position - b.position)
      .map(({ candidate }) => candidate);
    const offset =
      ((context.rotation % deck.length) + deck.length) % deck.length;
    return [...new Set([...deck.slice(offset), ...deck.slice(0, offset)])].sort(
      compareUsed,
    );
  }
  const history = context.history;
  const shuffled = shufflePokemon(candidates, context.random);
  if (!history) {
    return shuffled.sort(compareUsed);
  }
  return shuffled
    .map((candidate) => ({
      candidate,
      subjectRecency: context.questionType
        ? getSubjectRecency(history, context.questionType, candidate.name)
        : 0,
      used: Number(context.used.has(candidate.name)),
      pokemonRecency: getPokemonRecency(history, candidate.name),
    }))
    .sort(
      (a, b) =>
        a.subjectRecency - b.subjectRecency ||
        a.used - b.used ||
        a.pokemonRecency - b.pokemonRecency,
    )
    .map(({ candidate }) => candidate);
};

export const pickFreshTarget = (
  context: QuestionContext,
  candidates: readonly Candidate[],
): Candidate | undefined => {
  if (context.history || context.rotation !== undefined)
    return orderTargets(context, candidates)[0];
  const fresh = candidates.filter(({ name }) => !context.used.has(name));
  return pickPokemon(fresh.length > 0 ? fresh : candidates, context.random);
};

export const chooseTargets = (
  context: QuestionContext,
  candidates: readonly Candidate[],
  count: number,
  excluded: readonly Candidate[] = [],
): Candidate[] => {
  const ordered =
    context.history || context.rotation !== undefined
      ? orderTargets(context, candidates)
      : shufflePokemon(candidates, context.random);
  return distinctSpecies(
    ordered,
    ({ pokemon }) => pokemon.speciesId,
    excluded.map(({ pokemon }) => pokemon.speciesId),
  ).slice(0, count);
};

export const pickTarget = (
  context: QuestionContext,
  predicate: (pokemon: PokemonKnowledge) => boolean,
): Candidate | undefined => {
  const eligible = context.pool.filter(({ pokemon }) => predicate(pokemon));
  return pickFreshTarget(context, eligible);
};

export const distinctSpecies = <T>(
  candidates: readonly T[],
  speciesId: (candidate: T) => number,
  excluded: readonly number[] = [],
): T[] => {
  const seen = new Set(excluded);
  return candidates.filter((candidate) => {
    const id = speciesId(candidate);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};
