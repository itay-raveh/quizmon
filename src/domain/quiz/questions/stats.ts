import { pick, shuffle } from '../../../lib/random.ts';
import { formatPokemonName } from '../../pokemon/format.ts';
import { statNames, type StatName } from '../../pokemon/types.ts';
import { makeQuestion, targetMedia } from './assembly.ts';
import type { Candidate, QuestionBuilder } from './context.ts';
import { pokemonPrompt, textPrompt } from './prompts.ts';
import { optionSetRepetition } from './repetition.ts';
import {
  chooseTargets,
  distinctPokemon,
  pickFreshTarget,
} from './selection.ts';
import {
  makeTopicQuestion,
  ordered,
  orderedPokemon,
  pokemonSubject,
  topicEligible,
  topicSubject,
} from './topic-support.ts';

const yieldLabel = (yieldValues: Record<string, number>) =>
  statNames
    .filter((stat) => yieldValues[stat]! > 0)
    .map((stat) => `${yieldValues[stat]} ${formatPokemonName(stat)}`)
    .join(' + ');
export const buildEvYield: QuestionBuilder = (context) => {
  const pool = orderedPokemon(
    context,
    context.pool.filter(
      ({ pokemon }) =>
        pokemon.evYield &&
        Object.values(pokemon.evYield).some((value) => value > 0),
    ),
  );
  for (const target of pool) {
    const stats = statNames.filter((stat) => target.pokemon.evYield![stat] > 0);
    if (!context.variant?.completeEvYield && stats.length !== 1) continue;
    const correct = context.variant?.completeEvYield
      ? yieldLabel(target.pokemon.evYield!)
      : formatPokemonName(stats[0]!);
    const yieldDistances = new Map(
      pool.map(({ pokemon }) => [
        yieldLabel(pokemon.evYield!),
        statNames.reduce(
          (sum, stat) =>
            sum +
            Math.abs(target.pokemon.evYield![stat] - pokemon.evYield![stat]),
          0,
        ),
      ]),
    );
    const wrong = ordered(context, [
      ...new Set(
        context.variant?.completeEvYield
          ? pool.map((candidate) => yieldLabel(candidate.pokemon.evYield!))
          : statNames.map(formatPokemonName),
      ),
    ])
      .filter((value) => value !== correct)
      .sort((a, b) =>
        context.variant?.closeAlternatives
          ? (yieldDistances.get(a) ?? Infinity) -
            (yieldDistances.get(b) ?? Infinity)
          : 0,
      )
      .slice(0, 3);
    const options = [correct, ...wrong];
    const prompt = context.variant?.completeEvYield
      ? `What EVs does defeating ${target.pokemon.displayName} give?`
      : `Which stat gains EVs from defeating ${target.pokemon.displayName}?`;
    const question = makeTopicQuestion(
      context,
      pokemonSubject(target),
      prompt,
      correct,
      options,
      {
        prompt: {
          ...pokemonPrompt(
            target,
            context.variant?.completeEvYield
              ? 'What EVs does defeating '
              : 'Which stat gains EVs from defeating ',
            context.variant?.completeEvYield ? ' give?' : '?',
          ),
          supportingText: 'Base yield, before bonuses',
        },
        media: targetMedia(target),
        optionLabels: Object.fromEntries(
          options.map((value) => [value, value]),
        ),
        explanation: `Base yield: ${yieldLabel(target.pokemon.evYield!)}.`,
      },
      'stat',
    );
    if (question) return question;
  }
};
export const buildNature: QuestionBuilder = (context) => {
  const pool = ordered(
    context,
    (context.catalog.topics?.natures ?? []).filter(
      (entity) =>
        topicEligible(context, entity) && entity.raised !== entity.lowered,
    ),
  );
  for (const target of pool) {
    const seen = new Set([target.raised]);
    const wrong = pool
      .filter((candidate) => {
        if (candidate.name === target.name) return false;
        if (context.variant?.shareNatureStat)
          return (
            candidate.raised === target.raised ||
            candidate.lowered === target.lowered
          );
        if (seen.has(candidate.raised)) return false;
        seen.add(candidate.raised);
        return true;
      })
      .slice(0, 3);
    const options = [target, ...wrong];
    const question = makeTopicQuestion(
      context,
      topicSubject(context, 'nature', target),
      `Which nature raises ${formatPokemonName(target.raised)} and lowers ${formatPokemonName(target.lowered)}?`,
      target.name,
      options.map((entity) => entity.name),
      {
        optionLabels: Object.fromEntries(
          options.map((entity) => [entity.name, entity.label]),
        ),
        optionReveals: Object.fromEntries(
          options.map((entity) => [
            entity.name,
            `Raises ${formatPokemonName(entity.raised)}; lowers ${formatPokemonName(entity.lowered)}`,
          ]),
        ),
      },
      'stat',
    );
    if (question) return question;
  }
};
export const buildStatQuestion: QuestionBuilder = (context) => {
  const stat = pick(statNames, context.random) as StatName;
  const direction = context.random() < 0.5 ? 'highest' : 'lowest';
  const candidates = context.pool;
  const isDistractor = (target: Candidate, other: Candidate) => {
    const gap = Math.abs(
      target.pokemon.stats[stat] - other.pokemon.stats[stat],
    );
    if (
      context.variant?.statGap &&
      (gap < context.variant.statGap[0] || gap > context.variant.statGap[1])
    )
      return false;
    return direction === 'highest'
      ? other.pokemon.stats[stat] < target.pokemon.stats[stat]
      : other.pokemon.stats[stat] > target.pokemon.stats[stat];
  };
  const values = candidates
    .map(({ pokemon }) => pokemon.stats[stat])
    .sort((a, b) => a - b);
  const boundary = values[direction === 'highest' ? 2 : values.length - 3];
  const eligible = candidates.filter(
    ({ pokemon }) =>
      boundary !== undefined &&
      (direction === 'highest'
        ? pokemon.stats[stat] > boundary
        : pokemon.stats[stat] < boundary),
  );
  const examplesByValue = new Map<number, Candidate[]>();
  const targets = context.variant?.statGap
    ? eligible.filter((candidate) => {
        const value = candidate.pokemon.stats[stat];
        let examples = examplesByValue.get(value);
        if (!examples) {
          examples = distinctPokemon(
            candidates.filter((other) => isDistractor(candidate, other)),
            (entry) => entry,
          ).slice(0, 6);
          examplesByValue.set(value, examples);
        }
        return (
          distinctPokemon(examples, (entry) => entry, [candidate]).length >= 3
        );
      })
    : eligible;
  const target = pickFreshTarget(context, targets);
  if (!target) return undefined;
  const distractors = chooseTargets(
    context,
    candidates.filter((other) => isDistractor(target, other)),
    3,
    [target],
  );
  if (distractors.length !== 3) return undefined;
  const options = shuffle(
    [target.name, ...distractors.map(({ name }) => name)],
    context.random,
  );

  return {
    ...makeQuestion(context, {
      repeat: optionSetRepetition({
        subjects: 'all',
        variant: [stat, direction],
      }),
      category: 'stat',
      target,
      correct: target.name,
      options,
      prompt: textPrompt(
        `Which Pokémon has the ${direction} ${formatPokemonName(stat)}?`,
      ),
      presentation: { kind: 'pokemon' },
      details: { kind: 'stat', stat },
    }),
    visual: { direction, kind: 'stat-showdown', stat },
  };
};
