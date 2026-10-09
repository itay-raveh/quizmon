import type { FamilyRules } from './family-rules.ts';
import { formatPokemonName } from '../../pokemon/format.ts';
import { generations } from '../../pokemon/types.ts';
import {
  chooseSampledMultiCorrectCount,
  createPokemonSimilarityScorer,
} from './answers.ts';
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

const hasNamedLocation = (label: string) =>
  label.trim().length > 0 && !/^(?:\?+|unknown\b.*)$/i.test(label.trim());

export const buildRegion: QuestionBuilder<FamilyRules['locationRegion']> = (
  context,
) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const regions = topics.regions.filter((entity) =>
    topicEligible(context, entity),
  );
  if (regions.length < (context.variant.allOptions ? 2 : 4)) return;
  const pool = ordered(
    context,
    topics.locations.filter(
      (location) =>
        topicEligible(context, location) &&
        regions.some((region) => region.name === location.region) &&
        (context.variant.allowNumberedRoutes ||
          !/^(?:sea )?route \d+[a-z]?$/i.test(location.label)) &&
        hasNamedLocation(location.label) &&
        !/^(?:caf[eé]|restaurant)$/i.test(location.label) &&
        !/^(?:north|south|east|west) province \(area \w+\)$/i.test(
          location.label,
        ) &&
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
    const options = context.variant.allOptions
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
export const buildEncounter: QuestionBuilder<
  FamilyRules['encounterLocations']
> = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const eligible = new Map(
    context.pool.map((candidate) => [candidate.name, candidate]),
  );
  const encounters = topics.encounters.filter(
    (target) =>
      target.complete &&
      hasNamedLocation(target.label.split(' (')[0]!) &&
      (context.generations ?? generations).includes(target.generation) &&
      target.pokemon.some((name) => eligible.has(name)) &&
      (context.variant.encounterConditions ||
        !target.conditions.some(
          (condition) =>
            condition.startsWith('time-') || condition.startsWith('weather-'),
        )),
  );
  for (const target of orderEncounterLocations(context, encounters)) {
    const location = target.label.split(' (')[0]!;
    const sameLocation = topics.encounters.filter(
      (entry) =>
        entry.game === target.game &&
        entry.region === target.region &&
        entry.label.split(' (')[0] === location,
    );
    const possiblyAvailable = new Set(
      sameLocation
        .filter((entry) => entry.method === target.method)
        .flatMap((entry) => entry.pokemon),
    );
    const available = orderedPokemon(
      context,
      context.pool.filter((candidate) => possiblyAvailable.has(candidate.name)),
    );
    const multiSelect = context.variant.response.selection === 'multi';
    if (available.length < 1) continue;
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
    const similarity = createPokemonSimilarityScorer(
      available[0]!.pokemon,
      context.variant.similarityWeights,
    );
    const score = (candidate: (typeof available)[number]) =>
      (sameMethod.has(candidate.name)
        ? context.variant.sameEncounterMethodWeight
        : 0) + similarity(candidate.pokemon);
    const wrongCandidates = distinctPokemon(
      orderedPokemon(
        context,
        context.pool.filter(
          (candidate) =>
            !possiblyAvailable.has(candidate.name) &&
            (!context.variant.encounterConditions ||
              regional.has(candidate.name)),
        ),
      ),
    ).sort((a, b) =>
      context.variant.closeAlternatives ? score(b) - score(a) : 0,
    );
    const correctCount = multiSelect
      ? chooseSampledMultiCorrectCount(
          context,
          available.length,
          wrongCandidates.length,
        )
      : 1;
    if (correctCount === undefined) continue;
    const correct = available.slice(0, correctCount);
    const wrong = wrongCandidates.slice(0, 4 - correctCount);
    const options = distinctPokemon([...correct, ...wrong]);
    if (options.length !== 4) continue;
    const game = topics.games[target.game];
    if (!game) continue;
    const needsMethod = sameLocation.some((entry) =>
      entry.pokemon.some((name) =>
        wrong.some((candidate) => candidate.name === name),
      ),
    );
    const prompt = multiSelect
      ? `Which Pokémon can you find at ${location}? Select all that apply.`
      : `Which Pokémon can you find at ${location}?`;
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
      multiSelect ? correct.map(({ name }) => name) : correct[0]!.name,
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
        explanation: `${correct.map(({ pokemon }) => pokemon.displayName).join(', ')} can be found at ${location} in Pokémon ${game.label}.`,
      },
    );
    if (question) return question;
  }
};
