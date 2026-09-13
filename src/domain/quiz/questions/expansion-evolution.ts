import { formatPokemonName } from '../../pokemon/format';
import { generations } from '../../pokemon/types';
import type { EvolutionKnowledge } from '../topic-catalog';
import { getOptionVisuals } from './assembly';
import type { QuestionBuilder } from './context';
import {
  expansionQuestion,
  ordered,
  pokemonSubject,
  topicEligible,
} from './expansion-support';

const method = (entry: EvolutionKnowledge) =>
  [formatPokemonName(entry.trigger), ...entry.conditions].join(' · ');
const stones = new Set([
  'fire-stone',
  'water-stone',
  'thunder-stone',
  'leaf-stone',
  'moon-stone',
  'sun-stone',
  'shiny-stone',
  'dusk-stone',
  'dawn-stone',
  'ice-stone',
]);
export const buildEvolution: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const names = new Set(context.pool.map((candidate) => candidate.name));
  const pool = ordered(
    context,
    topics.evolutions.filter(
      (entry) =>
        names.has(entry.before) &&
        names.has(entry.after) &&
        (context.generations ?? generations).includes(entry.generation),
    ),
  );
  for (const target of pool) {
    const before = context.pool.find(
      (candidate) => candidate.name === target.before,
    )!;
    const after = context.pool.find(
      (candidate) => candidate.name === target.after,
    )!;
    if (
      !context.variant?.namesOnly &&
      (!before.pokemon.sprite || !after.pokemon.sprite)
    )
      continue;
    const game = topics.games[target.game];
    if (!game) continue;
    const itemQuestion = context.questionType === 'evolution-items';
    const alternatives = topics.evolutions.filter(
      (entry) =>
        entry.before === target.before &&
        entry.after === target.after &&
        entry.game === target.game,
    );
    const prompt = itemQuestion
      ? `Which item evolves ${before.pokemon.displayName} into ${after.pokemon.displayName}?`
      : `What are the minimum requirements to evolve ${before.pokemon.displayName} into ${after.pokemon.displayName}?`;
    const endpointVisuals = {
      kind: 'evolution-endpoints' as const,
      before: target.before,
      after: target.after,
      stages: getOptionVisuals(context, [target.before, target.after]),
    };
    if (itemQuestion) {
      if (
        target.trigger !== 'use-item' ||
        !target.item ||
        (!['direct-use'].includes(context.variant?.itemChoices ?? '') &&
          !stones.has(target.item))
      )
        continue;
      const correct = topics.items.find(
        (item) => item.name === target.item && topicEligible(context, item),
      );
      if (!correct || (!context.variant?.namesOnly && !correct.sprite))
        continue;
      const invalid = topics.items.filter(
        (item) =>
          topicEligible(context, item) &&
          !alternatives.some(
            (entry) => entry.item === item.name && entry.trigger === 'use-item',
          ) &&
          (context.variant?.namesOnly || item.sprite),
      );
      const seen = new Set([correct.category]);
      const wrong = ordered(context, invalid)
        .filter((item) => {
          if (context.variant?.itemChoices === 'stones')
            return stones.has(item.name);
          if (context.variant?.itemChoices === 'direct-use')
            return topics.evolutions.some(
              (entry) =>
                entry.trigger === 'use-item' && entry.item === item.name,
            );
          if (seen.has(item.category)) return false;
          seen.add(item.category);
          return true;
        })
        .slice(0, 3);
      const options = [correct, ...wrong];
      const question = expansionQuestion(
        context,
        pokemonSubject(before),
        prompt,
        correct.name,
        options.map((item) => item.name),
        {
          prompt: {
            kind: 'text',
            text: prompt,
            supportingText: [
              `Pokémon ${game.label}`,
              ...(target.conditions.length > 1
                ? target.conditions.slice(1)
                : []),
            ].join(' · '),
          },
          context: target.game,
          visual: endpointVisuals,
          optionLabels: Object.fromEntries(
            options.map((item) => [item.name, item.label]),
          ),
          optionImages: Object.fromEntries(
            options.flatMap((item) =>
              item.sprite ? [[item.name, item.sprite]] : [],
            ),
          ),
          explanation: `Use ${correct.label} directly on ${before.pokemon.displayName}.`,
        },
        'evolution',
      );
      if (question) return question;
    } else {
      if (
        context.variant?.evolutionConditions === 'simple' &&
        target.conditions.length !== 1
      )
        continue;
      if (
        context.variant?.evolutionConditions !== 'simple' &&
        target.conditions.length < 2
      )
        continue;
      const correct = method(target);
      let wrong: string[];
      if (context.variant?.evolutionConditions === 'one-condition') {
        const replacements = [
          ...new Set(pool.flatMap((entry) => entry.conditions)),
        ];
        wrong = ordered(context, replacements).flatMap((replacement) =>
          target.conditions.flatMap((condition, index) => {
            if (condition === replacement) return [];
            const conditions = target.conditions.map((value, position) =>
              position === index ? replacement : value,
            );
            const value = method({ ...target, conditions });
            return alternatives.some((entry) => method(entry) === value)
              ? []
              : [value];
          }),
        );
        // Lower thresholds can still satisfy a method. Mutations must contradict a required value.
        wrong = wrong.filter((value) => {
          const changed = value
            .split(' · ')
            .slice(1)
            .filter((part, index) => part !== target.conditions[index]);
          return (
            changed.length === 1 &&
            target.conditions.some(
              (condition) =>
                condition.replace(/\d+/g, '#') ===
                  changed[0]!.replace(/\d+/g, '#') &&
                Number(changed[0]!.match(/\d+/)?.[0]) <
                  Number(condition.match(/\d+/)?.[0]),
            )
          );
        });
      } else
        wrong = ordered(context, pool)
          .filter(
            (entry) =>
              entry.game === target.game &&
              !alternatives.some(
                (alternative) => method(alternative) === method(entry),
              ),
          )
          .map(method);
      if (context.variant?.evolutionConditions === 'one-condition') {
        const distance = (value: string) =>
          value
            .split(' · ')
            .slice(1)
            .reduce(
              (sum, part, index) =>
                sum +
                Math.abs(
                  Number(part.match(/\d+/)?.[0] ?? 0) -
                    Number(target.conditions[index]?.match(/\d+/)?.[0] ?? 0),
                ),
              0,
            );
        wrong.sort((a, b) => distance(a) - distance(b));
      }
      const options = [
        correct,
        ...[...new Set(wrong)].filter((value) => value !== correct).slice(0, 3),
      ];
      const shared = correct
        .split(' · ')
        .filter((part) =>
          options.every((option) => option.split(' · ').includes(part)),
        );
      const question = expansionQuestion(
        context,
        pokemonSubject(before),
        prompt,
        correct,
        options,
        {
          prompt: {
            kind: 'text',
            text: prompt,
            supportingText: [`Pokémon ${game.label}`, ...shared].join(' · '),
          },
          context: target.game,
          visual: endpointVisuals,
          optionLabels: Object.fromEntries(
            options.map((value) => [
              value,
              value
                .split(' · ')
                .filter((part) => !shared.includes(part))
                .join(' · '),
            ]),
          ),
          explanation: correct,
        },
        'evolution',
      );
      if (question) return question;
    }
  }
};
