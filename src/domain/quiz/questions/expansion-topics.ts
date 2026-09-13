import { formatPokemonName } from '../../pokemon/format';
import { generations } from '../../pokemon/types';
import type { QuestionBuilder } from './context';
import {
  expansionQuestion,
  ordered,
  topicEligible,
  topicSubject,
} from './expansion-support';

export const buildNature: QuestionBuilder = (context) => {
  const pool = ordered(
    context,
    (context.catalog.topics?.natures ?? []).filter(
      (entity) =>
        topicEligible(context, entity) && entity.raised !== entity.lowered,
    ),
  );
  for (const target of pool) {
    const seen = new Set([target.raised]);
    const wrong = pool
      .filter((candidate) => {
        if (candidate.name === target.name) return false;
        if (context.variant?.natureChoices === 'shared-stat')
          return (
            candidate.raised === target.raised ||
            candidate.lowered === target.lowered
          );
        if (seen.has(candidate.raised)) return false;
        seen.add(candidate.raised);
        return true;
      })
      .slice(0, 3);
    const options = [target, ...wrong];
    const question = expansionQuestion(
      context,
      topicSubject(context, 'nature', target),
      `Which nature raises ${formatPokemonName(target.raised)} and lowers ${formatPokemonName(target.lowered)}?`,
      target.name,
      options.map((entity) => entity.name),
      {
        optionLabels: Object.fromEntries(
          options.map((entity) => [entity.name, entity.label]),
        ),
        optionReveals: Object.fromEntries(
          options.map((entity) => [
            entity.name,
            `Raises ${formatPokemonName(entity.raised)}; lowers ${formatPokemonName(entity.lowered)}`,
          ]),
        ),
      },
      'stat',
    );
    if (question) return question;
  }
};
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
    const correct = gift
      ? target.giftType
      : context.variant?.completeFlavors
        ? positive.map(formatPokemonName).join(' + ')
        : formatPokemonName(strongest[0]!);
    const other = gift
      ? Object.keys(context.catalog.typeRelations)
      : context.variant?.completeFlavors
        ? [
            ...new Set(
              pool.map((berry) =>
                positiveFlavors(berry.flavors)
                  .map(formatPokemonName)
                  .join(' + '),
              ),
            ),
          ]
        : Object.keys(target.flavors).map(formatPokemonName);
    const flavorDistance = (value: string) => {
      const flavors = value.split(' + ');
      const answer = correct.split(' + ');
      return (
        flavors.filter((flavor) => !answer.includes(flavor)).length +
        answer.filter((flavor) => !flavors.includes(flavor)).length
      );
    };
    const options = gift
      ? other
      : [
          correct,
          ...ordered(
            context,
            other.filter((value) => value && value !== correct),
          )
            .sort((a, b) =>
              context.variant?.closeAlternatives
                ? flavorDistance(a) - flavorDistance(b)
                : 0,
            )
            .slice(0, 3),
        ];
    const item = topics.items.find((item) => item.name === target.item);
    if (!item?.sprite) continue;
    const prompt = gift
      ? `Which type does Natural Gift have with ${item.label}?`
      : context.variant?.completeFlavors
        ? `Which flavors does ${item.label} have?`
        : `What is the strongest flavor of ${item.label}?`;
    const question = expansionQuestion(
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
export const buildRegion: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const regions = topics.regions.filter((entity) =>
    topicEligible(context, entity),
  );
  const pool = ordered(
    context,
    topics.locations.filter(
      (location) =>
        topicEligible(context, location) &&
        regions.some((region) => region.name === location.region) &&
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
    const options = context.variant?.fullList
      ? regions
      : [
          targetRegion,
          ...ordered(
            context,
            regions.filter((region) => region.name !== target.region),
          ).slice(0, 3),
        ];
    const question = expansionQuestion(
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
    const question = expansionQuestion(
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
export const buildMove: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const pool = ordered(
    context,
    topics.moves.filter(
      (move) =>
        topicEligible(context, move) &&
        Object.hasOwn(context.catalog.typeRelations, move.type) &&
        ['physical', 'special', 'status'].includes(move.damageClass),
    ),
  );
  for (const target of pool) {
    const purpose = context.questionType === 'move-purpose';
    if (
      purpose &&
      [
        'photon-geyser',
        'light-that-burns-the-sky',
        'shell-side-arm',
        'tera-blast',
        'tera-starstorm',
      ].includes(target.name)
    )
      continue;
    const contexts = target.contexts.filter(
      (entry) =>
        (context.generations ?? generations).includes(entry.generation) &&
        (!purpose || generations.indexOf(entry.generation) >= 3),
    );
    for (const rules of ordered(context, contexts)) {
      if (context.variant?.reviewedDescription && !target.reviewedDescription)
        continue;
      const game = topics.games[rules.game];
      if (!game) continue;
      if (purpose) {
        if (
          context.variant?.damageClass === 'status' &&
          rules.damageClass !== 'status'
        )
          continue;
        const wrong = pool
          .filter(
            (move) =>
              ![
                'photon-geyser',
                'light-that-burns-the-sky',
                'shell-side-arm',
                'tera-blast',
                'tera-starstorm',
              ].includes(move.name) &&
              move.contexts.some(
                (entry) =>
                  entry.game === rules.game &&
                  entry.damageClass !== rules.damageClass &&
                  (!context.variant?.sameMoveType || entry.type === rules.type),
              ),
          )
          .slice(0, 3);
        const options = [target, ...wrong];
        const question = expansionQuestion(
          context,
          {
            ...topicSubject(context, 'move', target),
            generation: rules.generation,
          },
          `Which is a ${rules.damageClass} move?`,
          target.name,
          options.map((move) => move.name),
          {
            prompt: {
              kind: 'text',
              text: `Which is a ${rules.damageClass} move?`,
              supportingText: `Pokémon ${game.label}`,
            },
            context: rules.game,
            optionLabels: Object.fromEntries(
              options.map((move) => [move.name, move.label]),
            ),
            optionReveals: Object.fromEntries(
              options.map((move) => {
                const entry = move.contexts.find(
                  (entry) => entry.game === rules.game,
                )!;
                return [
                  move.name,
                  `${formatPokemonName(entry.type)} · ${formatPokemonName(entry.damageClass)}`,
                ];
              }),
            ),
          },
          'move',
        );
        if (question) return question;
      } else {
        const types = Object.keys(context.catalog.typeRelations);
        const options = context.variant?.fullList
          ? types
          : [
              rules.type,
              ...ordered(
                context,
                types.filter((type) => type !== rules.type),
              ).slice(0, 3),
            ];
        return expansionQuestion(
          context,
          {
            ...topicSubject(context, 'move', target),
            generation: rules.generation,
          },
          `What is the default type of ${target.label}?${context.variant?.reviewedDescription ? ` ${target.reviewedDescription}` : ''}`,
          rules.type,
          options,
          {
            prompt: {
              kind: 'text',
              text: `What is the default type of ${target.label}?${context.variant?.reviewedDescription ? ` ${target.reviewedDescription}` : ''}`,
              supportingText: `Pokémon ${game.label}`,
            },
            context: rules.game,
            optionLabels: Object.fromEntries(
              options.map((type) => [type, formatPokemonName(type)]),
            ),
            explanation: `${target.label} is ${formatPokemonName(rules.type)} type in Pokémon ${game.label}.`,
          },
          'move',
        );
      }
    }
  }
};
