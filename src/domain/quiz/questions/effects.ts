import type { EffectRules } from './family-rules.ts';
import type { QuestionBuilder } from './context.ts';
import { buildEffectDescription } from './effect-descriptions.ts';
import { ordered, topicEligible } from './topic-support.ts';

export const buildEffect: QuestionBuilder<EffectRules> = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const kind = context.questionType === 'ability-effects' ? 'ability' : 'item';
  const entities =
    kind === 'ability'
      ? topics.abilities
      : topics.items.filter(
          (item) =>
            item.effectKind ===
              (context.questionType === 'medicine-cabinet' ? 'bag' : 'held') &&
            (context.questionType !== 'medicine-cabinet' ||
              (item.category !== 'data-cards' &&
                item.name !== 'key-stone' &&
                !item.name.startsWith('mega-'))),
        );
  for (const target of ordered(
    context,
    entities.filter((entity) => topicEligible(context, entity)),
  )) {
    if (
      kind === 'item' &&
      'sprite' in target &&
      !target.sprite &&
      !context.variant.allowMissingSprites
    )
      continue;
    const question = buildEffectDescription(context, target, kind, entities);
    if (question) return question;
  }
};
