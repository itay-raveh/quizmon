import { formatPokemonName } from '../../pokemon/format';
import { generations } from '../../pokemon/types';
import type { QuestionBuilder } from './context';
import {
  distinctPokemon,
  expansionQuestion,
  ordered,
  orderedPokemon,
  picturedPokemon,
} from './expansion-support';

export const buildEncounter: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const eligible = new Map(
    context.pool.map((candidate) => [candidate.name, candidate]),
  );
  for (const target of ordered(context, topics.encounters)) {
    if (
      !target.complete ||
      !(context.generations ?? generations).includes(target.generation)
    )
      continue;
    if (
      !context.variant?.encounterConditions &&
      target.conditions.some(
        (condition) =>
          condition.startsWith('time-') || condition.startsWith('weather-'),
      )
    )
      continue;
    if (
      context.variant?.encounterConditions &&
      !target.conditions.some(
        (condition) =>
          condition.startsWith('time-') || condition.startsWith('weather-'),
      )
    )
      continue;
    const available = target.pokemon.flatMap((name) =>
      eligible.has(name) ? [eligible.get(name)!] : [],
    );
    const correct = orderedPokemon(context, available)[0];
    if (!correct) continue;
    const possiblyAvailable = new Set(
      topics.encounters
        .filter(
          (entry) =>
            entry.game === target.game &&
            entry.area === target.area &&
            entry.method === target.method,
        )
        .flatMap((entry) => entry.pokemon),
    );
    const regional = new Set(
      topics.encounters
        .filter(
          (entry) =>
            entry.game === target.game && entry.region === target.region,
        )
        .flatMap((entry) => entry.pokemon),
    );
    const wrong = distinctPokemon(
      orderedPokemon(
        context,
        context.pool.filter(
          (candidate) =>
            !possiblyAvailable.has(candidate.name) &&
            (!context.variant?.encounterConditions ||
              regional.has(candidate.name)),
        ),
      ),
    ).slice(0, 3);
    const options = distinctPokemon([correct, ...wrong]);
    if (options.length < 4) continue;
    const game = topics.games[target.game];
    if (!game) continue;
    const conditions = target.conditions.map(formatPokemonName).join(', ');
    return expansionQuestion(
      context,
      { kind: 'location', name: target.area, generation: target.generation },
      `In Pokémon ${game.label}, which Pokémon can be encountered at ${target.label} by ${formatPokemonName(target.method)}${conditions ? ` (${conditions})` : ''}? Use ordinary encounters without special events.`,
      correct.name,
      options.map((candidate) => candidate.name),
      {
        context: JSON.stringify([
          target.game,
          target.area,
          target.method,
          target.conditions,
        ]),
        ...picturedPokemon(context, options),
        explanation: `${correct.pokemon.displayName} has a recorded encounter here for this game, method and conditions.`,
      },
    );
  }
};
