import { formatPokemonName } from '../../pokemon/format.ts';
import { generations } from '../../pokemon/types.ts';
import type { QuestionBuilder } from './context.ts';
import {
  makeTopicQuestion,
  ordered,
  topicEligible,
  topicSubject,
} from './topic-support.ts';

const buildMachineDiscQuestion: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const types = Object.keys(context.catalog.typeRelations);
  if (types.length < 4) return;
  for (const target of ordered(
    context,
    topics.moves.filter((move) => topicEligible(context, move)),
  )) {
    for (const rules of ordered(context, target.contexts)) {
      if (
        !(context.generations ?? generations).includes(rules.generation) ||
        !types.includes(rules.type)
      )
        continue;
      const game = topics.games[rules.game];
      if (!game) continue;
      const options = [
        rules.type,
        ...ordered(
          context,
          types.filter((type) => type !== rules.type),
        ).slice(0, 3),
      ];
      const prompt = `Which TM disc matches ${target.label}?`;
      const question = makeTopicQuestion(
        context,
        {
          ...topicSubject(context, 'move', target),
          generation: rules.generation,
        },
        prompt,
        rules.type,
        options,
        {
          prompt: {
            kind: 'text',
            text: prompt,
            supportingText: `Pokémon ${game.label}`,
          },
          context: rules.game,
          optionImages: Object.fromEntries(
            options.map((type) => [type, `/sprites/items/tm-${type}.png`]),
          ),
          optionLabels: Object.fromEntries(
            options.map((type) => [type, formatPokemonName(type)]),
          ),
          explanation: `${target.label} is ${formatPokemonName(rules.type)} type in Pokémon ${game.label}.`,
        },
        'move',
      );
      if (question) return question;
    }
  }
};

export const buildItemIdentification: QuestionBuilder = (context) => {
  const chance = context.variant?.machineDiscChance ?? 0;
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
        topicEligible(context, item) && item.sprite && item.spriteIdentity,
    ),
  );
  const spriteCounts = new Map<string, number>();
  for (const item of topics.items.filter((item) => item.spriteIdentity))
    spriteCounts.set(
      item.spriteIdentity!,
      (spriteCounts.get(item.spriteIdentity!) ?? 0) + 1,
    );
  for (const target of pool) {
    if (spriteCounts.get(target.spriteIdentity!) !== 1) continue;
    const seen = new Set([target.category]);
    const wrong = pool.filter((item) => {
      if (
        item.name === target.name ||
        item.label === target.label ||
        item.spriteIdentity === target.spriteIdentity
      )
        return false;
      if (context.variant?.sameItemCategory)
        return (
          item.pocket === target.pocket && item.category === target.category
        );
      if (context.variant?.sameItemPocket) return item.pocket === target.pocket;
      if (context.variant?.distinctItemCategories ?? !context.variant) {
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
