import type { FamilyRules } from './family-rules.ts';
import type { QuestionBuilder } from './context.ts';
import { buildEffectDescription } from './effect-descriptions.ts';
import { ordered, topicEligible } from './topic-support.ts';

const namesThatRevealEffect = new Set([
  'antidote',
  'burn-heal',
  'ice-heal',
  'awakening',
  'paralyze-heal',
]);

export const buildEffect: QuestionBuilder<
  FamilyRules['abilityEffects' | 'itemUses' | 'heldItemEffects']
> = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const kind = context.questionType === 'abilityEffects' ? 'ability' : 'item';
  const entities =
    kind === 'ability'
      ? topics.abilities
      : topics.items.filter(
          (item) =>
            item.effectKind ===
              (context.questionType === 'itemUses' ? 'bag' : 'held') &&
            (context.questionType !== 'itemUses' ||
              (item.category !== 'data-cards' &&
                item.name !== 'key-stone' &&
                !item.name.startsWith('mega-'))),
        );
  for (const target of ordered(
    context,
    entities.filter((entity) => topicEligible(context, entity)),
  )) {
    if (
      context.questionType === 'itemUses' &&
      context.variant.rendering.subject.name === 'always' &&
      namesThatRevealEffect.has(target.name)
    )
      continue;
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
