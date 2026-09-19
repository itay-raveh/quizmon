import { formatPokemonName } from '../../pokemon/format.ts';
import { buildAbilityDescription } from './ability-descriptions.ts';
import type { QuestionBuilder } from './context.ts';
import { getEffectPresentation } from './effect-presentation.ts';
import {
  makeTopicQuestion,
  ordered,
  topicEligible,
  topicSubject,
} from './topic-support.ts';

export const buildEffect: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const kind = context.questionType === 'ability-effects' ? 'ability' : 'item';
  const entities = kind === 'ability' ? topics.abilities : topics.items;
  for (const target of ordered(
    context,
    entities.filter((entity) => topicEligible(context, entity)),
  )) {
    const fact = topics.effects.find(
      (entry) =>
        entry.kind === kind &&
        entry.name === target.name &&
        (!context.generations ||
          context.generations.includes(entry.battleGeneration)),
    );
    if (
      kind === 'ability' &&
      (context.variant?.effectChoices === 'broad' || !fact)
    ) {
      const ability = topics.abilities.find(
        (entry) => entry.name === target.name,
      )!;
      const question = buildAbilityDescription(context, ability);
      if (question) return question;
    }
    if (!fact) continue;
    const variant = fact.questions[context.variant?.effectChoices ?? 'broad'];
    const correct = variant.correct.value;
    const options = [correct, ...variant.wrong.map((choice) => choice.value)];
    const presentation = getEffectPresentation(fact, target.label, variant);
    const item =
      kind === 'item'
        ? topics.items.find((item) => item.name === target.name)
        : undefined;
    if (kind === 'item' && !item?.sprite) continue;
    return makeTopicQuestion(
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
