import { formatPokemonName } from '../../pokemon/format';
import type { QuestionBuilder } from './context';
import { getEffectPresentation } from './effect-presentation';
import {
  expansionQuestion,
  ordered,
  topicEligible,
  topicSubject,
} from './expansion-support';

export const buildMedicine: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const pool = topics.medicines.flatMap((fact) => {
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
    const fits = (item: (typeof pool)[number]) =>
      item.cures.includes(status) &&
      (!context.variant?.combinedCure || item.hp === 'full' || item.hp >= 100);
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
      const question = expansionQuestion(
        context,
        topicSubject(context, 'item', target),
        `Which item ${treatment}${context.variant?.combinedCure ? ' and restores HP from 100/200 to full' : ''}?`,
        target.name,
        options.map((item) => item.name),
        {
          context: JSON.stringify([
            'Core-series Bag use, excluding Legends games',
            status,
            context.variant?.combinedCure ? 100 : 0,
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
export const buildEffect: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const kind = context.questionType === 'ability-effects' ? 'ability' : 'item';
  for (const fact of ordered(
    context,
    topics.effects.filter((fact) => fact.kind === kind),
  )) {
    if (
      context.generations &&
      !context.generations.includes(fact.battleGeneration)
    )
      continue;
    const target = (kind === 'ability' ? topics.abilities : topics.items).find(
      (entity) => entity.name === fact.name && topicEligible(context, entity),
    );
    if (!target) continue;
    const variant = fact.questions[context.variant?.effectChoices ?? 'broad'];
    const correct = variant.correct.value;
    const options = [correct, ...variant.wrong.map((choice) => choice.value)];
    const presentation = getEffectPresentation(fact, target.label, variant);
    const item =
      kind === 'item'
        ? topics.items.find((item) => item.name === target.name)
        : undefined;
    if (kind === 'item' && !item?.sprite) continue;
    return expansionQuestion(
      context,
      topicSubject(context, kind, target),
      presentation.prompt.text,
      correct,
      options,
      {
        context: fact.context,
        ...(item?.sprite
          ? { media: { kind: 'pixel-sprite' as const, src: item.sprite } }
          : {}),
        ...presentation,
        explanation: `${formatPokemonName(target.name)}: ${fact.explanation}`,
      },
      kind === 'ability' ? 'ability' : 'knowledge',
    );
  }
};
