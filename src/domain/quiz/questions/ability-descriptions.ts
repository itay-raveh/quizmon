import type { TopicCatalog } from '../topic-catalog.ts';
import type { QuestionContext } from './context.ts';
import { makeTopicQuestion, ordered, topicSubject } from './topic-support.ts';

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .match(/[a-z]+/g)
      ?.filter(
        (word) =>
          !/^(the|a|an|this|that|its|it|is|of|to|and|or|in|on|by|for|with|when|from|has|have|can|will|s|pok|mon|pokemon|user|target|opponent|other|their|own|also|as|at|be|being|which|out|into|any)$/.test(
            word,
          ),
      ),
  );

// Similar wording can describe identical effects under different ability names.
const overlaps = (left: string, right: string) => {
  const a = words(left);
  const b = words(right);
  const shared = [...a].filter((word) => b.has(word)).length;
  return !a.size || !b.size || shared / Math.min(a.size, b.size) >= 0.35;
};

export const buildAbilityDescription = (
  context: QuestionContext,
  target: TopicCatalog['abilities'][number],
) => {
  const descriptions = (target.descriptions ?? []).filter(
    (entry) =>
      !context.generations || context.generations.includes(entry.generation),
  );
  for (const fact of ordered(context, descriptions)) {
    const choices = [fact.text];
    for (const ability of ordered(context, context.catalog.topics!.abilities)) {
      const alternative = ability.descriptions?.find(
        (entry) => entry.generation === fact.generation,
      );
      if (!alternative || ability.name === target.name) continue;
      if (overlaps(fact.text, alternative.text)) continue;
      if (
        choices.some(
          (text) => text.toLowerCase() === alternative.text.toLowerCase(),
        )
      )
        continue;
      choices.push(alternative.text);
      if (choices.length === 4) break;
    }
    if (choices.length !== 4) continue;
    return makeTopicQuestion(
      context,
      topicSubject(context, 'ability', target),
      `What does ${target.label} do?`,
      fact.text,
      choices,
      {
        context: `ability-description:${fact.generation}`,
        prompt: {
          kind: 'text',
          text: `What does ${target.label} do?`,
          supportingText: `Generation ${fact.generation}`,
        },
        optionLabels: Object.fromEntries(choices.map((text) => [text, text])),
        explanation: fact.explanation,
      },
      'ability',
    );
  }
};
