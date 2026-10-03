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

const positiveFlavors = (flavors: Record<string, number>) =>
  Object.keys(flavors)
    .filter((flavor) => flavors[flavor]! > 0)
    .sort();
export const buildBerry: QuestionBuilder<
  FamilyRules['berryFlavors'] | FamilyRules['naturalGift']
> = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const pool = ordered(
    context,
    topics.berries.filter((entity) => topicEligible(context, entity)),
  );
  for (const target of pool) {
    const gift = context.questionType === 'naturalGift';
    const multiFlavors =
      !gift && context.variant.response.selection === 'multi';
    const availableGiftGen = target.generations.find(
      (gen) =>
        ['IV', 'V', 'VI', 'VII'].includes(gen) &&
        (context.generations ?? generations).includes(gen),
    );
    if (gift && !availableGiftGen) continue;
    const positive = positiveFlavors(target.flavors);
    if (gift ? !target.giftType : !positive.length) continue;
    const max = Math.max(...Object.values(target.flavors));
    const strongest = positive.filter(
      (flavor) => target.flavors[flavor] === max,
    );
    if (!gift && !multiFlavors && strongest.length !== 1) continue;
    const strongestFlavor = gift ? '' : formatPokemonName(strongest[0]!);
    const correct = gift
      ? target.giftType
      : multiFlavors
        ? positive.map(formatPokemonName)
        : strongestFlavor;
    const other = gift
      ? Object.keys(context.catalog.typeRelations)
      : Object.keys(target.flavors).map(formatPokemonName);
    const options =
      gift || multiFlavors
        ? other
        : [
            strongestFlavor,
            ...ordered(
              context,
              other.filter((value) => value && value !== strongestFlavor),
            ).slice(0, 3),
          ];
    const item = topics.items.find((item) => item.name === target.item);
    if (!item?.sprite) continue;
    const prompt = gift
      ? `Which type does Natural Gift have with ${item.label}?`
      : multiFlavors
        ? `Which flavors does ${item.label} have?`
        : `What is the strongest flavor of ${item.label}?`;
    const question = makeTopicQuestion(
      context,
      {
        ...topicSubject(context, 'berry', target),
        ...(gift ? { generation: availableGiftGen! } : {}),
      },
      prompt,
      correct,
      options,
      {
        prompt: {
          kind: 'item',
          before: gift
            ? 'Which type does Natural Gift have with '
            : multiFlavors
              ? 'Which flavors does '
              : 'What is the strongest flavor of ',
          after: !gift && multiFlavors ? ' have?' : '',
          name: item.label,
          sprite: item.sprite,
          ...(gift ? { supportingText: `Generation ${availableGiftGen}` } : {}),
        },
        media: { kind: 'pixel-sprite', src: item.sprite },
        optionLabels: Object.fromEntries(
          options.map((value) => [
            value,
            gift ? formatPokemonName(value) : value,
          ]),
        ),
        explanation: gift
          ? `Natural Gift type: ${formatPokemonName(target.giftType)}.`
          : `Flavor potencies: ${positive.map((flavor) => `${formatPokemonName(flavor)} ${target.flavors[flavor]}`).join(', ')}.`,
      },
    );
    if (question) return question;
  }
};
