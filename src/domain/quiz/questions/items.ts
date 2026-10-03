import type { FamilyRules } from './family-rules.ts';
import { formatPokemonName } from '../../pokemon/format.ts';
import type { QuestionBuilder } from './context.ts';
import {
  makeTopicQuestion,
  ordered,
  topicEligible,
  topicSubject,
} from './topic-support.ts';

export const buildItemIdentification: QuestionBuilder<
  FamilyRules['itemIdentification']
> = (context) => {
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
    if (
      context.variant.response.kind !== 'search' &&
      (target.pocket === 'berries' || target.category === 'apricorn-box')
    )
      continue;
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
            sprite: item.sprite,
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
        optionImages: Object.fromEntries(
          options.map((item) => [item.name, item.sprite!]),
        ),
        explanation: `${target.label}. Bag pocket: ${formatPokemonName(target.pocket)}. Category: ${formatPokemonName(target.category)}.`,
      },
    );
    if (question) return question;
  }
};
