import type { FamilyRules } from './family-rules.ts';
import { formatPokemonName } from '../../pokemon/format.ts';
import { generations } from '../../pokemon/types.ts';
import type { QuestionBuilder } from './context.ts';
import {
  makeTopicQuestion,
  ordered,
  topicEligible,
  topicSubject,
} from './topic-support.ts';

const buildMachineDiscQuestion: QuestionBuilder<
  FamilyRules['item-identification']
> = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const types = Object.keys(context.catalog.typeRelations);
  if (context.variant.response.kind !== 'search' && types.length < 4) return;
  for (const target of ordered(
    context,
    topics.moves.filter((move) =>
      move.contexts.some(
        (entry) =>
          entry.machine &&
          (context.generations ?? generations).includes(entry.generation),
      ),
    ),
  )) {
    for (const rules of ordered(context, target.contexts)) {
      if (
        !(context.generations ?? generations).includes(rules.generation) ||
        !types.includes(rules.type) ||
        !rules.machine
      )
        continue;
      const game = topics.games[rules.game];
      if (!game) continue;
      const search = context.variant.response.kind === 'search';
      const machines = [
        ...new Set(
          topics.moves.flatMap((move) =>
            move.contexts.flatMap((entry) =>
              entry.game === rules.game && entry.machine ? [entry.machine] : [],
            ),
          ),
        ),
      ];
      const seenTypes = new Set([rules.type]);
      const alternatives = search
        ? []
        : ordered(
            context,
            topics.moves.flatMap((move) =>
              move.contexts.flatMap((entry) =>
                entry.game === rules.game &&
                entry.machine &&
                types.includes(entry.type) &&
                entry.type !== rules.type
                  ? [{ machine: entry.machine, type: entry.type }]
                  : [],
              ),
            ),
          )
            .filter(({ type }) => {
              if (seenTypes.has(type)) return false;
              seenTypes.add(type);
              return true;
            })
            .slice(0, 3);
      if (!search && alternatives.length !== 3) continue;
      const options = [
        { machine: rules.machine, type: rules.type },
        ...alternatives,
      ];
      const prompt = search
        ? `Which TM teaches ${target.label}?`
        : `Which TM disc matches ${target.label}?`;
      const question = makeTopicQuestion(
        context,
        { kind: 'move', name: target.name, generation: rules.generation },
        prompt,
        rules.machine,
        options.map(({ machine }) => machine),
        {
          prompt: {
            kind: 'text',
            text: prompt,
            supportingText: `Pokémon ${game.label}`,
          },
          context: rules.game,
          ...(search
            ? {
                searchOptions: machines.map((machine) => ({
                  name: machine,
                  label: `TM ${machine.slice(2)}`,
                })),
              }
            : {}),
          optionImages: Object.fromEntries(
            options.map(({ machine, type }) => [
              machine,
              `/sprites/items/tm-${type}.png`,
            ]),
          ),
          optionLabels: Object.fromEntries(
            options.map(({ machine }) => [machine, `TM ${machine.slice(2)}`]),
          ),
          explanation: `${target.label} is taught by TM ${rules.machine.slice(2)} (${formatPokemonName(rules.type)} type) in Pokémon ${game.label}.`,
        },
        'move',
      );
      if (question) return question;
    }
  }
};

export const buildItemIdentification: QuestionBuilder<
  FamilyRules['item-identification']
> = (context) => {
  const chance = context.variant.machineDiscChance;
  if (chance === 1 || (chance > 0 && context.random() < chance)) {
    const question = buildMachineDiscQuestion(context);
    if (question) return question;
  }
  const topics = context.catalog.topics;
  if (!topics) return;
  const pool = ordered(
    context,
    topics.items.filter(
      (item) =>
        topicEligible(context, item) &&
        item.sprite &&
        item.spriteIdentity &&
        !/glasses|goggles|scarf/i.test(item.name),
    ),
  );
  const spriteCounts = new Map<string, number>();
  for (const item of topics.items.filter((item) => item.spriteIdentity))
    spriteCounts.set(
      item.spriteIdentity!,
      (spriteCounts.get(item.spriteIdentity!) ?? 0) + 1,
    );
  const searchable = pool.filter(
    (item) => spriteCounts.get(item.spriteIdentity!) === 1,
  );
  const labelCounts = new Map<string, number>();
  for (const item of searchable)
    labelCounts.set(item.label, (labelCounts.get(item.label) ?? 0) + 1);
  const uniqueNames = searchable.filter(
    (item) => labelCounts.get(item.label) === 1,
  );
  for (const target of pool) {
    if (spriteCounts.get(target.spriteIdentity!) !== 1) continue;
    if (context.variant.response.kind === 'search') {
      if (labelCounts.get(target.label) !== 1) continue;
      const question = makeTopicQuestion(
        context,
        topicSubject(context, 'item', target),
        'Which item is shown?',
        target.name,
        [target.name],
        {
          media: { kind: 'pixel-sprite', src: target.sprite! },
          searchOptions: uniqueNames.map((item) => ({
            name: item.name,
            label: item.label,
          })),
          optionLabels: { [target.name]: target.label },
          explanation: `${target.label}. Bag pocket: ${formatPokemonName(target.pocket)}. Category: ${formatPokemonName(target.category)}.`,
        },
      );
      if (question) return question;
      continue;
    }
    const seen = new Set([target.category]);
    const wrong = pool.filter((item) => {
      if (
        item.name === target.name ||
        item.label === target.label ||
        item.spriteIdentity === target.spriteIdentity
      )
        return false;
      if (context.variant.sameItemCategory)
        return (
          item.pocket === target.pocket && item.category === target.category
        );
      if (context.variant.sameItemPocket) return item.pocket === target.pocket;
      if (context.variant.distinctItemCategories) {
        if (seen.has(item.category)) return false;
        seen.add(item.category);
      }
      return true;
    });
    const unique = wrong
      .filter(
        (item, index, all) =>
          all.findIndex(
            (other) =>
              other.spriteIdentity === item.spriteIdentity &&
              other.label === item.label,
          ) === index,
      )
      .slice(0, 3);
    const options = [target, ...unique];
    const question = makeTopicQuestion(
      context,
      topicSubject(context, 'item', target),
      'Which item is shown?',
      target.name,
      options.map((item) => item.name),
      {
        media: { kind: 'pixel-sprite', src: target.sprite! },
        optionLabels: Object.fromEntries(
          options.map((item) => [item.name, item.label]),
        ),
        explanation: `${target.label}. Bag pocket: ${formatPokemonName(target.pocket)}. Category: ${formatPokemonName(target.category)}.`,
      },
    );
    if (question) return question;
  }
};
