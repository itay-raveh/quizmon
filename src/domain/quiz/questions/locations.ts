import { formatPokemonName } from '../../pokemon/format.ts';
import { generations } from '../../pokemon/types.ts';
import { questionTuning } from '../question-variants.ts';
import { createPokemonSimilarityScorer } from './answers.ts';
import type { QuestionBuilder } from './context.ts';
import { orderEncounterLocations } from './encounter-order.ts';
import {
  distinctPokemon,
  makeTopicQuestion,
  ordered,
  orderedPokemon,
  picturedPokemon,
  topicEligible,
  topicSubject,
} from './topic-support.ts';

export const buildRegion: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const regions = topics.regions.filter((entity) =>
    topicEligible(context, entity),
  );
  if (regions.length < (context.variant?.fullList ? 2 : 4)) return;
  const pool = ordered(
    context,
    topics.locations.filter(
      (location) =>
        topicEligible(context, location) &&
        regions.some((region) => region.name === location.region) &&
        !topics.regions.some((region) =>
          location.label.toLowerCase().includes(region.name.toLowerCase()),
        ),
    ),
  );
  for (const target of pool) {
    const targetRegion = regions.find(
      (region) => region.name === target.region,
    )!;
    if (
      topics.locations.some(
        (location) =>
          location.label === target.label && location.region !== target.region,
      )
    )
      continue;
    const options = context.variant?.fullList
      ? regions
      : [
          targetRegion,
          ...ordered(
            context,
            regions.filter((region) => region.name !== target.region),
          ).slice(0, 3),
        ];
    const question = makeTopicQuestion(
      context,
      topicSubject(context, 'location', target),
      `Which region contains ${target.label}?`,
      target.region,
      options.map((region) => region.name),
      {
        optionLabels: Object.fromEntries(
          options.map((region) => [region.name, region.label]),
        ),
        explanation: `${target.label} is in ${targetRegion.label}.`,
      },
    );
    if (question) return question;
  }
};
export const buildEncounter: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const eligible = new Map(
    context.pool.map((candidate) => [candidate.name, candidate]),
  );
  const encounters = topics.encounters.filter(
    (target) =>
      target.complete &&
      (context.generations ?? generations).includes(target.generation) &&
      target.pokemon.some((name) => eligible.has(name)) &&
      (context.variant?.encounterConditions ||
        !target.conditions.some(
          (condition) =>
            condition.startsWith('time-') || condition.startsWith('weather-'),
        )),
  );
  for (const target of orderEncounterLocations(context, encounters)) {
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
    const sameMethod = new Set(
      topics.encounters
        .filter(
          (entry) =>
            entry.game === target.game &&
            entry.region === target.region &&
            entry.method === target.method,
        )
        .flatMap((entry) => entry.pokemon),
    );
    const similarity = createPokemonSimilarityScorer(correct.pokemon);
    const score = (candidate: typeof correct) =>
      (sameMethod.has(candidate.name)
        ? questionTuning.sameEncounterMethodWeight
        : 0) + similarity(candidate.pokemon);
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
    )
      .sort((a, b) =>
        context.variant?.closeAlternatives ? score(b) - score(a) : 0,
      )
      .slice(0, 3);
    const options = distinctPokemon([correct, ...wrong]);
    if (options.length < 4) continue;
    const game = topics.games[target.game];
    if (!game) continue;
    const needsMethod = topics.encounters.some(
      (entry) =>
        entry.game === target.game &&
        entry.area === target.area &&
        entry.pokemon.some((name) =>
          wrong.some((candidate) => candidate.name === name),
        ),
    );
    const location = target.label;
    const prompt = `Which Pokémon can you find at ${location}?`;
    const supportingText = [
      `Pokémon ${game.label}`,
      ...(needsMethod
        ? [`Encounter: ${formatPokemonName(target.method)}`]
        : []),
    ].join(' · ');
    const question = makeTopicQuestion(
      context,
      { kind: 'location', name: target.area, generation: target.generation },
      prompt,
      correct.name,
      options.map((candidate) => candidate.name),
      {
        prompt: { kind: 'text', text: prompt, supportingText },
        context: JSON.stringify([
          target.game,
          target.area,
          target.method,
          target.conditions,
        ]),
        ...picturedPokemon(context, options),
        explanation: `${correct.pokemon.displayName} can be found at ${location} in Pokémon ${game.label}.`,
      },
    );
    if (question) return question;
  }
};
