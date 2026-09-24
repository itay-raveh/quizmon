import type { QuestionBuilder } from './context.ts';
import { buildEffectDescription } from './effect-descriptions.ts';
import { ordered, topicEligible } from './topic-support.ts';

export const buildEffect: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const kind = context.questionType === 'ability-effects' ? 'ability' : 'item';
  const entities = kind === 'ability' ? topics.abilities : topics.items;
  for (const target of ordered(
    context,
    entities.filter((entity) => topicEligible(context, entity)),
  )) {
    if (
      kind === 'item' &&
      'sprite' in target &&
      !target.sprite &&
      !context.variant?.allowMissingSprites
    )
      continue;
    const question = buildEffectDescription(context, target, kind);
    if (question) return question;
  }
};
