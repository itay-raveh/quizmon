import { formatPokemonName } from '../../pokemon/format';
import { generations } from '../../pokemon/types';
import type { EvolutionKnowledge } from '../topic-catalog';
import { pokemonOptions } from './answers';
import { getOptionVisuals, makeQuestion } from './assembly';
import type { QuestionBuilder } from './context';
import {
  evolutionRequirement,
  presentEvolutionQuestion,
} from './evolution-presentation';
import { pokemonPrompt, textPrompt } from './prompts';
import { targetRepetition } from './repetition';
import { pickFreshTarget, pickTarget } from './selection';
import {
  makeTopicQuestion,
  ordered,
  pokemonSubject,
  topicEligible,
} from './topic-support';
import { typeOptions } from './type-options';

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
      !context.variant?.allowMissingSprites &&
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
      if (
        !correct ||
        (!context.variant?.allowMissingSprites && !correct.sprite)
      )
        continue;
      const invalid = topics.items.filter(
        (item) =>
          topicEligible(context, item) &&
          !alternatives.some(
            (entry) => entry.item === item.name && entry.trigger === 'use-item',
          ) &&
          (context.variant?.allowMissingSprites || item.sprite),
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
      const question = makeTopicQuestion(
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
      const itemForRequirement = (condition: string) =>
        topics.items.find(
          (entry) =>
            entry.name.replaceAll('-', ' ') ===
            condition.replace(/^(use |holding )/, ''),
        );
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
      let options: string[] = [];
      for (const condition of ordered(context, target.conditions)) {
        const requirement = evolutionRequirement(condition);
        const itemRequirement = ['item', 'held-item'].includes(
          requirement.kind,
        );
        if (itemRequirement && !itemForRequirement(condition)?.sprite) continue;
        const replacements = ordered(context, [
          ...new Set(
            topics.evolutions
              .filter((entry) => entry.game === target.game || itemRequirement)
              .flatMap((entry) => entry.conditions),
          ),
        ]).filter(
          (replacement) =>
            replacement !== condition &&
            (!itemRequirement ||
              Boolean(
                itemForRequirement(replacement)?.sprite &&
                itemForRequirement(replacement)?.generations.includes(
                  target.generation,
                ),
              )) &&
            evolutionRequirement(replacement).kind === requirement.kind &&
            !alternatives.some((entry) =>
              entry.conditions.includes(replacement),
            ),
        );
        if (
          context.variant?.evolutionConditions === 'one-condition' &&
          requirement.value !== undefined
        )
          replacements.sort(
            (a, b) =>
              Math.abs(evolutionRequirement(a).value! - requirement.value) -
              Math.abs(evolutionRequirement(b).value! - requirement.value),
          );
        if (replacements.length < 3) continue;
        options = [
          correct,
          ...replacements.slice(0, 3).map((replacement) =>
            method({
              ...target,
              conditions: target.conditions.map((value) =>
                value === condition ? replacement : value,
              ),
            }),
          ),
        ];
        break;
      }
      if (options.length !== 4) continue;
      const shared = correct
        .split(' · ')
        .filter((part) =>
          options.every((option) => option.split(' · ').includes(part)),
        );
      const question = makeTopicQuestion(
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
            options.map((value) => {
              const part = value
                .split(' · ')
                .find((part) => !shared.includes(part))!;
              const label = ['item', 'held-item'].includes(
                evolutionRequirement(part).kind,
              )
                ? itemForRequirement(part)!.label
                : evolutionRequirement(part).label;
              return [value, label];
            }),
          ),
          optionImages: Object.fromEntries(
            options.flatMap((option) => {
              const part = option
                .split(' · ')
                .find((value) => !shared.includes(value));
              if (
                !part ||
                !['item', 'held-item'].includes(evolutionRequirement(part).kind)
              )
                return [];
              const item = itemForRequirement(part);
              return item?.sprite ? [[option, item.sprite]] : [];
            }),
          ),
          explanation: correct,
        },
        'evolution',
      );
      if (question)
        return presentEvolutionQuestion(
          { ...question, questionType: 'evolution-conditions' },
          topics.evolutions,
        );
    }
  }
};
export const buildEvolutionShiftQuestion: QuestionBuilder = (context) => {
  const poolNames = new Set(context.pool.map(({ name }) => name));
  const target = pickTarget(context, ({ evolvesTo, types }) => {
    if (evolvesTo.length !== 1) return false;
    const evolutionName = evolvesTo[0];
    const evolution = evolutionName
      ? context.catalog.pokemon[evolutionName]
      : undefined;
    return Boolean(
      evolutionName &&
      poolNames.has(evolutionName) &&
      evolution?.sprite &&
      evolution.types.filter((type) => !types.includes(type)).length === 1,
    );
  });
  if (!target?.pokemon.sprite) return undefined;
  const evolutionName = target.pokemon.evolvesTo[0];
  const evolution = evolutionName
    ? context.catalog.pokemon[evolutionName]
    : undefined;
  const correct = evolution?.types.find(
    (type) => !target.pokemon.types.includes(type),
  );
  if (!correct || !evolutionName || !evolution?.sprite) return undefined;

  return {
    ...makeQuestion(context, {
      repeat: targetRepetition({
        pokemonOptions: false,
        related: [evolutionName],
      }),
      category: 'evolution',
      target,
      correct,
      options: typeOptions(context, target, correct),
      prompt: pokemonPrompt(target, 'Which type can ', ' gain after evolving?'),
      media: { kind: 'pixel-sprite', src: target.pokemon.sprite },
      presentation: { kind: 'text' },
    }),
    visual: {
      evolution: {
        dexNumber: evolution.speciesId,
        name: evolutionName,
        src: evolution.sprite,
        types: evolution.types,
      },
      gainedType: correct,
      kind: 'evolution-shift',
    },
  };
};
const regionalForm = (name: string): string | undefined =>
  name.match(/-(alola|galar|hisui|paldea)(?:-|$)/)?.[1];
export const buildEvolutionLinkQuestion: QuestionBuilder = (context) => {
  const poolNames = new Set(context.pool.map(({ name }) => name));
  const middleStages = context.pool.filter(
    ({ pokemon }) => pokemon.evolvesFrom && pokemon.evolvesTo.length > 0,
  );
  const regions = new Map(
    middleStages.map(({ name }) => [name, regionalForm(name)]),
  );
  const chains = middleStages.flatMap((target) => {
    const { name, pokemon } = target;
    const before = pokemon.evolvesFrom;
    const after = pokemon.evolvesTo[0];
    if (
      !before ||
      !after ||
      pokemon.evolvesTo.length !== 1 ||
      !poolNames.has(before) ||
      !poolNames.has(after)
    )
      return [];
    const first = context.catalog.pokemon[before];
    const last = context.catalog.pokemon[after];
    if (
      !first ||
      !last ||
      first.evolvesFrom ||
      last.evolvesTo.length > 0 ||
      !first.evolvesTo.includes(name) ||
      last.evolvesFrom !== name
    )
      return [];
    const region = regions.get(name);
    const possibleAnswers = middleStages.filter(
      ({ name: option, pokemon: candidate }) =>
        option !== before &&
        option !== after &&
        candidate.speciesName !== pokemon.speciesName &&
        regions.get(option) === region,
    );
    if (!context.variant?.search && possibleAnswers.length < 3) return [];
    return [{ target, before, after, possibleAnswers }];
  });
  const selected = pickFreshTarget(
    context,
    chains.map(({ target }) => target),
  );
  const chain = chains.find(({ target }) => target === selected);
  if (!chain) return undefined;
  const { target, before, after, possibleAnswers } = chain;
  return {
    ...makeQuestion(context, {
      repeat: targetRepetition({
        pokemonOptions: true,
        related: [before, after],
      }),
      category: 'evolution',
      target,
      correct: target.name,
      options: pokemonOptions(context, {
        correct: target,
        excluded: [before, after],
        candidates: possibleAnswers,
      }),
      prompt: textPrompt(
        `Complete the evolution chain: ${formatPokemonName(before)} → ? → ${formatPokemonName(after)}.`,
      ),
      presentation: { kind: 'pokemon' },
    }),
    visual: {
      kind: 'evolution-link',
      before,
      after,
      stages: getOptionVisuals(context, [before, target.name, after]),
    },
  };
};
