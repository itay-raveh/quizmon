import { createSeededRandom, shuffle } from '../../../lib/random';
import type { PokemonKnowledge } from '../../pokemon/types';
import { getPokemonRecency, getSubjectRecency } from '../question-history';
import type { Candidate, QuestionContext } from './context';
import { groupPokemon, pickForm, speciesWeight } from './sampling';
import { getSpeciesHistory, speciesName } from './species-history';

export const orderSpecies = (
  context: QuestionContext,
  candidates: readonly Candidate[],
  subjects = true,
): Candidate[][] => {
  const groups = groupPokemon(candidates);
  const used = new Set(
    [...context.used].map((name) => speciesName(context.catalog, name)),
  );
  const history =
    context.rotation === undefined ? getSpeciesHistory(context) : undefined;
  let slots: Candidate[][];
  if (context.rotation !== undefined) {
    const random = createSeededRandom(
      `question-species-rotation-v2:${context.questionType}`,
    );
    const deck = groups
      .sort((a, b) => a[0]!.pokemon.speciesId - b[0]!.pokemon.speciesId)
      .flatMap((group) => {
        const weight = speciesWeight(group);
        const phase = random();
        return Array.from({ length: weight }, (_, index) => ({
          group,
          position: (index + phase) / weight,
        }));
      })
      .sort((a, b) => a.position - b.position)
      .map(({ group }) => group);
    const offset =
      ((context.rotation % deck.length) + deck.length) % deck.length;
    slots = [...new Set([...deck.slice(offset), ...deck.slice(0, offset)])];
  } else {
    slots = [
      ...new Set(
        shuffle(
          groups.flatMap((group) =>
            Array<Candidate[]>(speciesWeight(group)).fill(group),
          ),
          context.random,
        ),
      ),
    ];
  }
  const ranked = slots
    .map((group) => {
      const name = group[0]!.pokemon.speciesName;
      return {
        group,
        weight: speciesWeight(group),
        subjectRecency:
          history && subjects && context.questionType
            ? getSubjectRecency(history, context.questionType, name)
            : 0,
        used: subjects ? Number(used.has(name)) : 0,
        recency: history ? getPokemonRecency(history, name) : 0,
      };
    })
    .sort(
      (a, b) =>
        a.subjectRecency - b.subjectRecency ||
        a.used - b.used ||
        a.recency - b.recency,
    );
  const queues = new Map<number, Candidate[][]>();
  for (const { group, weight } of ranked) {
    const queue = queues.get(weight) ?? [];
    queue.push(group);
    queues.set(weight, queue);
  }
  // Recency reorders species within a weight class without changing its sampled slots.
  return slots.map((group) => queues.get(speciesWeight(group))!.shift()!);
};

export const pickFreshTarget = (
  context: QuestionContext,
  candidates: readonly Candidate[],
): Candidate | undefined => {
  const group = orderSpecies(context, candidates)[0];
  return group ? pickForm(group, context.random) : undefined;
};

export const chooseTargets = (
  context: QuestionContext,
  candidates: readonly Candidate[],
  count: number,
  excluded: readonly Candidate[] = [],
  subjects = true,
): Candidate[] => {
  const selected: Candidate[] = [];
  while (selected.length < count) {
    const eligible = candidates.filter(
      (candidate) =>
        distinctPokemon([candidate], (value) => value, [
          ...excluded,
          ...selected,
        ]).length > 0,
    );
    const group = orderSpecies(context, eligible, subjects)[0];
    if (!group) break;
    const candidate = pickForm(group, context.random);
    if (candidate) selected.push(candidate);
  }
  return selected;
};

export const distinctPokemon = <T>(
  candidates: readonly T[],
  getCandidate: (value: T) => Candidate,
  excluded: readonly Candidate[] = [],
): T[] => {
  const keys = ({ name, pokemon }: Candidate): string[] => [
    `species:${pokemon.speciesId}`,
    ...(pokemon.sprite ? [`sprite:${pokemon.sprite}`] : []),
    // These species share a Gigantamax appearance despite separate sprite URLs.
    // https://bulbapedia.bulbagarden.net/wiki/Appletun
    ...(['flapple-gmax', 'appletun-gmax'].includes(name)
      ? ['appearance:gigantamax-apple']
      : []),
  ];
  const seen = new Set(excluded.flatMap(keys));
  return candidates.filter((value) => {
    const candidateKeys = keys(getCandidate(value));
    if (candidateKeys.some((key) => seen.has(key))) return false;
    for (const key of candidateKeys) seen.add(key);
    return true;
  });
};

export const pickTarget = (
  context: QuestionContext,
  predicate: (pokemon: PokemonKnowledge) => boolean,
): Candidate | undefined => {
  const eligible = context.pool.filter(({ pokemon }) => predicate(pokemon));
  return pickFreshTarget(context, eligible);
};
