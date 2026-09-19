import { formatPokemonName } from '../../pokemon/format';
import { generations } from '../../pokemon/types';
import type { QuestionBuilder } from './context';
import {
  makeTopicQuestion,
  ordered,
  topicEligible,
  topicSubject,
} from './topic-support';

const positiveFlavors = (flavors: Record<string, number>) =>
  Object.keys(flavors)
    .filter((flavor) => flavors[flavor]! > 0)
    .sort();
export const buildBerry: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const pool = ordered(
    context,
    topics.berries.filter((entity) => topicEligible(context, entity)),
  );
  for (const target of pool) {
    const gift = context.questionType === 'natural-gift';
    const availableGiftGen = target.generations.find(
      (gen) =>
        ['IV', 'V', 'VI', 'VII'].includes(gen) &&
        (context.generations ?? generations).includes(gen),
    );
    if (gift && !availableGiftGen) continue;
    const positive = positiveFlavors(target.flavors);
    if (!positive.length) continue;
    const max = Math.max(...Object.values(target.flavors));
    const strongest = positive.filter(
      (flavor) => target.flavors[flavor] === max,
    );
    if (!gift && !context.variant?.completeFlavors && strongest.length !== 1)
      continue;
    const strongestFlavor = formatPokemonName(strongest[0]!);
    const correct = gift
      ? target.giftType
      : context.variant?.completeFlavors
        ? positive.map(formatPokemonName)
        : strongestFlavor;
    const other = gift
      ? Object.keys(context.catalog.typeRelations)
      : Object.keys(target.flavors).map(formatPokemonName);
    const options = gift
      ? other
      : context.variant?.completeFlavors
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
      : context.variant?.completeFlavors
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
          kind: 'text',
          text: prompt,
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
