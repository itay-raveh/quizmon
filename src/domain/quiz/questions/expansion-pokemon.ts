import { pokemonPrompt } from './prompts';
import { statNames } from '../../pokemon/types';
import { formatPokemonName } from '../../pokemon/format';
import {
  measurementWinner,
  formatMeasurement,
  isMeasurementSeparation,
  isMeasurementClusterMember,
} from '../measurement-comparison';
import { targetMedia } from './assembly';
import { createPokemonSimilarityScorer } from './answers';
import type { QuestionBuilder } from './context';
import {
  distinctPokemon,
  expansionQuestion,
  ordered,
  orderedPokemon,
  topicEligible,
  picturedPokemon,
  pokemonSubject,
} from './expansion-support';

export const buildMeasurement =
  (measurement: 'height' | 'weight'): QuestionBuilder =>
  (context) => {
    const rules = context.variant?.measurement;
    if (!rules) return;
    const pool = distinctPokemon(
      orderedPokemon(
        context,
        context.pool.filter(
          ({ pokemon }) =>
            Number.isSafeInteger(pokemon[measurement]) &&
            pokemon[measurement]! > 0,
        ),
      ),
    );
    const direction = context.random() < 0.5 ? 'highest' : 'lowest';
    for (const target of pool) {
      const value = target.pokemon[measurement]!;
      const candidates = pool.filter(
        (candidate) =>
          (direction === 'highest'
            ? candidate.pokemon[measurement]! < value
            : candidate.pokemon[measurement]! > value) &&
          isMeasurementClusterMember(
            value,
            candidate.pokemon[measurement]!,
            direction,
            rules,
          ),
      );
      for (const nearest of candidates.filter((candidate) =>
        isMeasurementSeparation(
          value,
          candidate.pokemon[measurement]!,
          direction,
          rules,
        ),
      )) {
        const seen = new Set<number>([value, nearest.pokemon[measurement]!]);
        const rest = candidates.filter((candidate) =>
          direction === 'highest'
            ? candidate.pokemon[measurement]! < nearest.pokemon[measurement]!
            : candidate.pokemon[measurement]! > nearest.pokemon[measurement]!,
        );
        const chosen = [
          target,
          nearest,
          ...rest
            .filter((candidate) => {
              const n = candidate.pokemon[measurement]!;
              if (seen.has(n)) return false;
              seen.add(n);
              return true;
            })
            .slice(0, 2),
        ];
        const values = chosen.map(
          (candidate) => candidate.pokemon[measurement]!,
        );
        if (measurementWinner(values, direction, rules) !== 0) continue;
        return expansionQuestion(
          context,
          pokemonSubject(target),
          `Which Pokémon is ${measurement === 'weight' ? (direction === 'highest' ? 'heaviest' : 'lightest') : direction === 'highest' ? 'tallest' : 'shortest'}?`,
          target.name,
          chosen.map((candidate) => candidate.name),
          {
            ...picturedPokemon(context, chosen),
            optionReveals: Object.fromEntries(
              chosen.map((candidate) => [
                candidate.name,
                formatMeasurement(candidate.pokemon[measurement]!, measurement),
              ]),
            ),
          },
        );
      }
    }
  };
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
    return expansionQuestion(
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
export const buildHidden: QuestionBuilder = (context) => {
  const pool = orderedPokemon(context, context.pool);
  for (const target of pool) {
    const slots = target.pokemon.abilitySlots;
    const hidden = slots
      ?.filter((slot) => slot.hidden)
      .map((slot) => slot.name);
    if (
      !hidden ||
      hidden.length !== 1 ||
      (!context.variant?.allowMissingSprites && !target.pokemon.sprite)
    )
      continue;
    const allowed = new Set(
      (context.catalog.topics?.abilities ?? [])
        .filter((ability) => topicEligible(context, ability))
        .map((ability) => ability.name),
    );
    if (slots!.some((slot) => !allowed.has(slot.name))) continue;
    const correct = hidden[0]!;
    const ordinary = [
      ...new Set(
        slots!.filter((slot) => !slot.hidden).map((slot) => slot.name),
      ),
    ].filter((name) => name !== correct);
    const similar = pool.filter(
      ({ pokemon }) =>
        !context.variant?.hiddenAbility ||
        context.variant.hiddenAbility !== 'similar' ||
        pokemon.types.some((type) => target.pokemon.types.includes(type)),
    );
    const other = ordered(context, [
      ...new Set(
        similar.flatMap(
          ({ pokemon }) => pokemon.abilitySlots?.map((slot) => slot.name) ?? [],
        ),
      ),
    ]).filter(
      (name) =>
        allowed.has(name) && name !== correct && !ordinary.includes(name),
    );
    const options = [correct, ...ordinary, ...other].slice(0, 4);
    const question = expansionQuestion(
      context,
      pokemonSubject(target),
      `What is ${target.pokemon.displayName}’s Hidden Ability?`,
      correct,
      options,
      {
        prompt: pokemonPrompt(target, 'What is ', '’s Hidden Ability?'),
        media: targetMedia(target),
        explanation: `Hidden Ability: ${formatPokemonName(correct)}. Ordinary abilities: ${ordinary.map(formatPokemonName).join(', ') || 'none'}.`,
      },
      'ability',
    );
    if (question) return question;
  }
};
export const buildEggGroups: QuestionBuilder = (context) => {
  const pool = distinctPokemon(
    orderedPokemon(
      context,
      context.pool.filter(({ pokemon }) => !!pokemon.eggGroups?.length),
    ),
  );
  for (const target of pool) {
    const groups = target.pokemon.eggGroups!;
    const matches = pool.filter(
      (candidate) =>
        candidate.pokemon.speciesName !== target.pokemon.speciesName &&
        candidate.pokemon.eggGroups!.some((group) => groups.includes(group)),
    );
    const similarity = createPokemonSimilarityScorer(target.pokemon);
    if (context.variant?.closeAlternatives)
      matches.sort((a, b) => similarity(a.pokemon) - similarity(b.pokemon));
    const wrong = pool
      .filter(
        (candidate) =>
          !candidate.pokemon.eggGroups!.some((group) => groups.includes(group)),
      )
      .sort((a, b) =>
        context.variant?.closeAlternatives
          ? similarity(b.pokemon) - similarity(a.pokemon)
          : 0,
      )
      .slice(0, 3);
    if (!matches.length || wrong.length < 3) continue;
    const correct = matches[0]!;
    const options = [correct, ...wrong];
    const prompt = `Which Pokémon shares an Egg Group with ${target.pokemon.displayName}?`;
    return expansionQuestion(
      context,
      pokemonSubject(target),
      prompt,
      correct.name,
      options.map((candidate) => candidate.name),
      {
        prompt: {
          ...pokemonPrompt(
            target,
            'Which Pokémon shares an Egg Group with ',
            '?',
          ),
          ...(context.variant?.showEggGroups
            ? {
                supportingText: `Egg Groups: ${groups.map(formatPokemonName).join(', ')}`,
              }
            : {}),
        },
        ...picturedPokemon(context, options),
        media: targetMedia(target),
        optionReveals: Object.fromEntries(
          options.map((candidate) => [
            candidate.name,
            candidate.pokemon.eggGroups!.map(formatPokemonName).join(', '),
          ]),
        ),
        explanation: `${target.pokemon.displayName}: ${groups.map(formatPokemonName).join(', ')}. This compares Egg Group classification.`,
      },
    );
  }
};
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
        statNames.every(
          (stat) =>
            Number.isSafeInteger(pokemon.evYield![stat]) &&
            pokemon.evYield![stat] >= 0,
        ) &&
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
    const question = expansionQuestion(
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
