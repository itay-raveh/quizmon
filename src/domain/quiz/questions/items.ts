import { formatPokemonName } from '../../pokemon/format.ts';
import type { QuestionBuilder } from './context.ts';
import {
  makeTopicQuestion,
  ordered,
  topicEligible,
  topicSubject,
} from './topic-support.ts';

export const buildItemIdentification: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const pool = ordered(
    context,
    topics.items.filter(
      (item) =>
        topicEligible(context, item) && item.sprite && item.spriteIdentity,
    ),
  );
  for (const target of pool) {
    const seen = new Set([target.category]);
    const wrong = pool.filter((item) => {
      if (
        item.name === target.name ||
        item.label === target.label ||
        item.spriteIdentity === target.spriteIdentity
      )
        return false;
      if (context.variant?.itemChoices === 'category')
        return (
          item.pocket === target.pocket && item.category === target.category
        );
      if (context.variant?.itemChoices === 'pocket')
        return item.pocket === target.pocket;
      if (seen.has(item.category)) return false;
      seen.add(item.category);
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
export const buildMedicine: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const pool = topics.medicines.flatMap((fact) => {
    if (
      context.difficulty &&
      context.difficulty > 1 &&
      (fact.name === 'full-heal' || fact.name === 'full-restore')
    )
      return [];
    const item = topics.items.find(
      (item) => item.name === fact.name && topicEligible(context, item),
    );
    return item && (context.variant?.allowMissingSprites || item.sprite)
      ? [{ ...item, ...fact }]
      : [];
  });
  const statuses = ordered(context, [
    'poison',
    'burn',
    'freeze',
    'sleep',
    'paralysis',
  ] as const);
  for (const status of statuses) {
    const treatment = {
      poison: 'cures poisoning',
      burn: 'heals a burn',
      freeze: 'thaws a frozen Pokémon',
      sleep: 'wakes a sleeping Pokémon',
      paralysis: 'cures paralysis',
    }[status];
    const fits = (item: (typeof pool)[number]) => item.cures.includes(status);
    for (const target of ordered(context, pool.filter(fits))) {
      const seen = new Set([target.category]);
      const wrong = ordered(
        context,
        pool.filter((item) => !fits(item)),
      )
        .filter((item) => {
          if (context.variant?.itemChoices === 'medicines')
            return item.pocket === 'medicine';
          if (seen.has(item.category)) return false;
          seen.add(item.category);
          return true;
        })
        .slice(0, 3);
      if (
        context.variant?.itemChoices === 'medicines' &&
        target.pocket !== 'medicine'
      )
        continue;
      const options = [target, ...wrong];
      const question = makeTopicQuestion(
        context,
        topicSubject(context, 'item', target),
        `Which item ${treatment}?`,
        target.name,
        options.map((item) => item.name),
        {
          context: JSON.stringify([
            'Core-series Bag use, excluding Legends games',
            status,
            0,
          ]),
          optionLabels: Object.fromEntries(
            options.map((item) => [item.name, item.label]),
          ),
          optionImages: Object.fromEntries(
            options.flatMap((item) =>
              item.sprite ? [[item.name, item.sprite]] : [],
            ),
          ),
          explanation: `${target.label} cures ${target.cures.join(', ')}${target.hp === 'full' ? ' and restores HP to full' : ''}.`,
        },
      );
      if (question) return question;
    }
  }
};
