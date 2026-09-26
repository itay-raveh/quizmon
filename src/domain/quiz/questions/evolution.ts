import type { FamilyRules } from './family-rules.ts';
import { formatPokemonName } from '../../pokemon/format.ts';
import { generations } from '../../pokemon/types.ts';
import type { EvolutionKnowledge } from '../topic-catalog.ts';
import { pokemonOptions } from './answers.ts';
import { getOptionVisuals, makeQuestion } from './assembly.ts';
import type { QuestionBuilder } from './context.ts';
import { pokemonPrompt, textPrompt } from './prompts.ts';
import { targetRepetition } from './repetition.ts';
import { pickFreshTarget, pickTarget } from './selection.ts';
import { makeTopicQuestion, ordered, pokemonSubject } from './topic-support.ts';
import { typeOptions } from './type-options.ts';

const evolutionRequirements = (entry: EvolutionKnowledge): string[] =>
  ['level-up', 'use-item', 'trade'].includes(entry.trigger)
    ? [
        ...(entry.trigger === 'trade' &&
        !entry.conditions.some((condition) =>
          condition.startsWith('traded for '),
        )
          ? ['trade']
          : []),
        ...entry.conditions,
      ]
    : [];

const evolutionConditionLabel = (
  condition: string,
  variant: NonNullable<
    Parameters<
      QuestionBuilder<FamilyRules['evolution-conditions']>
    >[0]['variant']
  >,
): string | undefined => {
  if (condition === 'trade')
    return variant.compactEvolutionLabels ? 'Trade' : 'Trade this Pokémon';
  const level = /^at level (\d+)$/.exec(condition);
  if (level)
    return variant.exactEvolutionValues || variant.mixedLevelEvolutionConditions
      ? variant.compactEvolutionLabels
        ? `Level ${level[1]}`
        : `Reach level ${level[1]}`
      : undefined;
  const threshold = /^with at least (\d+) (happiness|beauty|affection)$/.exec(
    condition,
  );
  if (threshold)
    return variant.exactEvolutionValues
      ? `Minimum ${threshold[2] === 'happiness' ? 'friendship' : threshold[2]}: ${threshold[1]}`
      : `Have high ${threshold[2] === 'happiness' ? 'friendship' : threshold[2]}`;
  if (/^\d+ times$/.test(condition)) return undefined;
  if (/\d/.test(condition) && !variant.exactEvolutionValues) return undefined;
  if (condition.startsWith('use ') && !variant.directEvolutionItems) return;
  if (!variant.evolutionLocations && /^(at |in |near )/.test(condition))
    return undefined;
  if (condition.startsWith('holding '))
    return `Hold ${formatPokemonName(condition.slice(8).replaceAll(' ', '-'))}`;
  if (condition.startsWith('use '))
    return `Use ${formatPokemonName(condition.slice(4).replaceAll(' ', '-'))}`;
  if (condition.startsWith('knowing '))
    return `Know ${formatPokemonName(condition.slice(8).replaceAll(' ', '-'))}`;
  if (condition.startsWith('during the '))
    return `Evolve during the ${condition.slice(11)}`;
  if (condition.startsWith('as a ')) return `Be ${condition.slice(5)}`;
  if (condition.startsWith('at '))
    return `Level up at ${formatPokemonName(condition.slice(3).replaceAll(' ', '-'))}`;
  if (condition.startsWith('in '))
    return `Evolve in ${formatPokemonName(condition.slice(3).replaceAll(' ', '-'))}`;
  if (condition.startsWith('near ')) return `Level up ${condition}`;
  if (condition.startsWith('with Attack ')) return `Have ${condition.slice(5)}`;
  if (condition.startsWith('with ')) return `Have ${condition.slice(5)}`;
  if (condition.startsWith('traded for '))
    return `Trade for ${formatPokemonName(condition.slice(11))}`;
  if (condition.startsWith('under ') || condition.startsWith('while '))
    return `Evolve ${condition}`;
  return condition.charAt(0).toUpperCase() + condition.slice(1);
};

const evolutionConditionKind = (condition: string) =>
  condition === 'trade'
    ? 'trade'
    : condition.replace(/\d+/g, '#').split(' ')[0];

export const buildEvolution: QuestionBuilder<
  FamilyRules['evolution-conditions']
> = (context) => {
  const topics = context.catalog.topics;
  const variant = context.variant;
  if (!topics || !variant) return;
  const names = new Set(context.pool.map((candidate) => candidate.name));
  const preferExactLevel = context.random() < variant.exactLevelQuestionChance;
  const numericOnlyMethod = (entry: EvolutionKnowledge) =>
    entry.trigger === 'level-up' &&
    entry.conditions.length === 1 &&
    /^at level \d+$/.test(entry.conditions[0]!);
  const pool = ordered(
    context,
    topics.evolutions.filter(
      (entry) =>
        names.has(entry.before) &&
        names.has(entry.after) &&
        (context.generations ?? generations).includes(entry.generation),
    ),
  );
  if (variant.exactLevelQuestionChance)
    pool.sort(
      (a, b) =>
        Number(numericOnlyMethod(b) === preferExactLevel) -
        Number(numericOnlyMethod(a) === preferExactLevel),
    );
  for (const target of pool) {
    const exactLevel = preferExactLevel && numericOnlyMethod(target);
    const before = context.pool.find(({ name }) => name === target.before)!;
    const after = context.pool.find(({ name }) => name === target.after)!;
    if (
      !variant.allowMissingSprites &&
      (!before.pokemon.sprite || !after.pokemon.sprite)
    )
      continue;
    const game = topics.games[target.game];
    if (!game) continue;
    const methods = topics.evolutions.filter(
      (entry) =>
        entry.before === target.before &&
        entry.after === target.after &&
        entry.game === target.game,
    );
    if (
      new Set(
        methods.map((entry) =>
          JSON.stringify([entry.trigger, entry.item, entry.conditions]),
        ),
      ).size !== 1
    )
      continue;
    const requirements = evolutionRequirements(target);
    const allTrue = requirements.flatMap((condition) => {
      const label = evolutionConditionLabel(condition, variant);
      return label ? [{ condition, label }] : [];
    });
    if (allTrue.length < (exactLevel ? 1 : variant.minimumEvolutionConditions))
      continue;
    const trueChoices = ordered(context, allTrue).slice(
      0,
      variant.multiSelectEvolutionConditions && !exactLevel ? 3 : 1,
    );
    const trueLabels = new Set(allTrue.map(({ label }) => label));
    const wrongByLabel = new Map<
      string,
      { condition: string; label: string }
    >();
    for (const entry of topics.evolutions) {
      if (entry.game !== target.game) continue;
      for (const condition of evolutionRequirements(entry)) {
        if (requirements.includes(condition)) continue;
        if (exactLevel && !/^at level \d+$/.test(condition)) continue;
        const label = evolutionConditionLabel(condition, variant);
        if (label && !trueLabels.has(label))
          wrongByLabel.set(label, { condition, label });
      }
    }
    const wrongPool = ordered(context, [...wrongByLabel.values()]);
    if (exactLevel) {
      const level = Number(target.conditions[0]!.slice(9));
      wrongPool.sort(
        (a, b) =>
          Math.abs(Number(a.condition.slice(9)) - level) -
          Math.abs(Number(b.condition.slice(9)) - level),
      );
    }
    const selectedWrong: typeof wrongPool = [];
    const numeric = trueChoices.find(({ condition }) =>
      /^at level \d+$/.test(condition),
    );
    if (numeric && variant.preferCloseConditionValues) {
      const level = Number(numeric.condition.slice(9));
      const closest = wrongPool
        .filter(({ condition }) => /^at level \d+$/.test(condition))
        .sort(
          (a, b) =>
            Math.abs(Number(a.condition.slice(9)) - level) -
            Math.abs(Number(b.condition.slice(9)) - level),
        )[0];
      if (closest) selectedWrong.push(closest);
    }
    const usedKinds = new Set(
      [...trueChoices, ...selectedWrong].map(({ condition }) =>
        evolutionConditionKind(condition),
      ),
    );
    for (const choice of wrongPool) {
      if (selectedWrong.length === 4 - trueChoices.length) break;
      if (selectedWrong.includes(choice)) continue;
      const kind = evolutionConditionKind(choice.condition);
      if (usedKinds.has(kind)) continue;
      selectedWrong.push(choice);
      usedKinds.add(kind);
    }
    if (numericOnlyMethod(target) && !exactLevel && selectedWrong.length < 3)
      continue;
    for (const choice of wrongPool) {
      if (selectedWrong.length === 4 - trueChoices.length) break;
      if (!selectedWrong.includes(choice)) selectedWrong.push(choice);
    }
    if (selectedWrong.length !== 4 - trueChoices.length) continue;
    const correct = trueChoices.map(({ label }) => label);
    const options = [...correct, ...selectedWrong.map(({ label }) => label)];
    const multipleAnswers =
      variant.multiSelectEvolutionConditions && !exactLevel;
    const prompt = exactLevel
      ? 'What is the minimum level for this evolution?'
      : multipleAnswers
        ? 'Which of these are requirements for this evolution? Select all that apply.'
        : 'Which of these is a requirement for this evolution?';
    const question = makeTopicQuestion(
      context,
      pokemonSubject(before),
      prompt,
      multipleAnswers ? correct : correct[0]!,
      options,
      {
        prompt: {
          kind: 'text',
          text: prompt,
          supportingText: `Pokémon ${game.label}`,
        },
        context: target.game,
        visual: {
          kind: 'evolution-endpoints',
          before: target.before,
          after: target.after,
          stages: getOptionVisuals(context, [target.before, target.after]),
        },
        optionLabels: Object.fromEntries(
          options.map((label) => [
            label,
            exactLevel ? label.split(' ').at(-1)! : label,
          ]),
        ),
      },
      'evolution',
    );
    if (question)
      return {
        ...question,
        questionType: 'evolution-conditions',
        options: exactLevel
          ? question.options.toSorted(
              (a, b) =>
                Number(a.split(' ').at(-1)) - Number(b.split(' ').at(-1)),
            )
          : question.options,
      };
  }
};
export const buildEvolutionShiftQuestion: QuestionBuilder<
  FamilyRules['evolution-shift']
> = (context) => {
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
export const buildEvolutionLinkQuestion: QuestionBuilder<
  FamilyRules['evolution-link']
> = (context) => {
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
    if (
      context.variant.response.kind !== 'search' &&
      possibleAnswers.length < 3
    )
      return [];
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
