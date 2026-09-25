import type { TopicCatalog } from '../topic-catalog.ts';
import type { QuestionContext } from './context.ts';
import { makeTopicQuestion, ordered, topicSubject } from './topic-support.ts';

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .match(/[a-z]+|\d+(?:\.\d+)?/g)
      ?.filter(
        (word) =>
          !/^(the|a|an|this|that|its|it|is|of|to|and|or|in|on|by|for|with|when|from|has|have|can|will|s|pok|mon|pokemon|user|target|opponent|other|their|own|also|as|at|be|being|which|out|into|any)$/.test(
            word,
          ),
      ),
  );

const similarity = (left: string, right: string) => {
  const a = words(left);
  const b = words(right);
  const shared = [...a].filter((word) => b.has(word)).length;
  return !a.size || !b.size ? 1 : shared / Math.min(a.size, b.size);
};

export const buildEffectDescription = (
  context: QuestionContext,
  target: TopicCatalog['abilities'][number] | TopicCatalog['items'][number],
  kind: 'ability' | 'item',
  entities: (
    TopicCatalog['abilities'][number] | TopicCatalog['items'][number]
  )[],
) => {
  const descriptions = (target.descriptions ?? []).filter(
    (entry) =>
      !context.generations || context.generations.includes(entry.generation),
  );
  for (const fact of ordered(context, descriptions)) {
    const exact = context.variant?.effectChoices === 'exact';
    const correct = exact ? fact.explanation : fact.text;
    const sameCategory = context.variant?.itemChoices === 'category';
    const minimumSimilarity = sameCategory
      ? context.variant?.effectChoices === 'exact'
        ? 0.5
        : context.variant?.effectChoices === 'related'
          ? 0.3
          : 0
      : 0;
    const alternatives = ordered(context, entities)
      .flatMap((entity) => {
        const entry = entity.descriptions?.find(
          (entry) => entry.generation === fact.generation,
        );
        if (!entry || entity.name === target.name) return [];
        if (sameCategory && 'category' in entity && 'category' in target) {
          const targetGroup =
            target.pocket === 'berries' ? 'berries' : target.category;
          const entityGroup =
            entity.pocket === 'berries' ? 'berries' : entity.category;
          if (targetGroup !== entityGroup) return [];
        }
        const score = similarity(fact.text, entry.text);
        if (score >= (sameCategory ? 0.8 : 0.35)) return [];
        if (score < minimumSimilarity) return [];
        return [
          {
            text: exact ? entry.explanation : entry.text,
            score,
          },
        ];
      })
      .filter(
        ({ text }, index, all) =>
          text !== correct &&
          all.findIndex(
            (entry) => entry.text.toLowerCase() === text.toLowerCase(),
          ) === index,
      );
    if (context.variant?.effectChoices !== 'broad')
      alternatives.sort((a, b) => b.score - a.score);
    const options = [
      correct,
      ...alternatives.slice(0, 3).map(({ text }) => text),
    ];
    if (options.length !== 4) continue;
    const prompt = `What does ${target.label} do?`;
    return makeTopicQuestion(
      context,
      { ...topicSubject(context, kind, target), generation: fact.generation },
      prompt,
      correct,
      options,
      {
        context: `effect-description:${fact.generation}`,
        prompt: {
          kind: 'text',
          text: prompt,
          ...(context.questionType === 'medicine-cabinet'
            ? {}
            : { supportingText: `Generation ${fact.generation}` }),
        },
        ...(kind === 'item' && 'sprite' in target && target.sprite
          ? { media: { kind: 'pixel-sprite' as const, src: target.sprite } }
          : {}),
        optionLabels: Object.fromEntries(options.map((text) => [text, text])),
        explanation: fact.explanation,
      },
      kind === 'ability' ? 'ability' : 'knowledge',
    );
  }
};
