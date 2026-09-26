import type { TopicCatalog } from '../topic-catalog.ts';
import { questionTuning } from '../question-variants.ts';
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
    if (kind === 'ability' && context.variant?.search) {
      const searchable = entities.filter((entity) =>
        entity.descriptions?.some(
          (entry) => entry.generation === fact.generation,
        ),
      );
      if (
        searchable.some(
          (entity) =>
            entity.name !== target.name &&
            entity.descriptions?.some(
              (entry) =>
                entry.generation === fact.generation &&
                entry.text === fact.text,
            ),
        )
      )
        continue;
      const prompt = 'Which Ability has this effect?';
      return makeTopicQuestion(
        context,
        { ...topicSubject(context, kind, target), generation: fact.generation },
        prompt,
        target.name,
        [target.name],
        {
          context: `effect-description:${fact.generation}`,
          prompt: {
            kind: 'text',
            text: prompt,
            description: fact.text,
            supportingText: `Generation ${fact.generation}`,
          },
          searchOptions: searchable.map(({ name }) => ({ name })),
          explanation: fact.text,
        },
        'ability',
      );
    }
    const exact = context.variant?.useFullEffectText;
    const correct = exact ? fact.explanation : fact.text;
    const sameCategory = context.variant?.sameItemCategory;
    const minimumSimilarity = context.variant?.minimumEffectSimilarity ?? 0;
    const maximumSimilarity =
      context.variant?.maximumEffectSimilarity ??
      questionTuning.maximumEffectSimilarity;
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
        if (score >= maximumSimilarity) return [];
        if (score < minimumSimilarity) return [];
        return [
          {
            name: entity.name,
            label: entity.label,
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
    if (context.variant?.preferSimilarEffects ?? true)
      alternatives.sort((a, b) => b.score - a.score);
    const options =
      kind === 'ability'
        ? [target.name, ...alternatives.slice(0, 3).map(({ name }) => name)]
        : [correct, ...alternatives.slice(0, 3).map(({ text }) => text)];
    if (options.length !== 4) continue;
    const prompt =
      kind === 'ability'
        ? 'Which Ability has this effect?'
        : `What does ${target.label} do?`;
    return makeTopicQuestion(
      context,
      { ...topicSubject(context, kind, target), generation: fact.generation },
      prompt,
      kind === 'ability' ? target.name : correct,
      options,
      {
        context: `effect-description:${fact.generation}`,
        prompt: {
          kind: 'text',
          text: prompt,
          ...(kind === 'ability' ? { description: fact.text } : {}),
          ...(context.questionType === 'medicine-cabinet'
            ? {}
            : { supportingText: `Generation ${fact.generation}` }),
        },
        ...(kind === 'item' && 'sprite' in target && target.sprite
          ? { media: { kind: 'pixel-sprite' as const, src: target.sprite } }
          : {}),
        optionLabels:
          kind === 'ability'
            ? Object.fromEntries([
                [target.name, target.label] as const,
                ...alternatives
                  .slice(0, 3)
                  .map(({ name, label }) => [name, label] as const),
              ])
            : Object.fromEntries(options.map((text) => [text, text])),
        explanation: kind === 'ability' ? fact.text : fact.explanation,
      },
      kind === 'ability' ? 'ability' : 'knowledge',
    );
  }
};
