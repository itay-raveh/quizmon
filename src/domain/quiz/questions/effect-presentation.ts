import { formatPokemonName } from '../../pokemon/format';
import type { QuestionData } from '../types';
import type { EffectKnowledge, EffectQuestion } from '../topic-catalog';

export const getEffectPresentation = (
  fact: EffectKnowledge,
  name: string,
  variant: EffectQuestion,
) => ({
  prompt: {
    kind: 'text' as const,
    text: variant.prompt ?? `What does ${name} do?`,
    supportingText: [
      `Generation ${fact.battleGeneration}`,
      variant.supportingText,
    ]
      .filter(Boolean)
      .join(' · '),
  },
  optionLabels: Object.fromEntries(
    [variant.correct, ...variant.wrong].map(({ value, label }) => [
      value,
      label,
    ]),
  ),
});

export const presentEffectQuestion = (
  question: QuestionData,
  effects?: readonly EffectKnowledge[],
): QuestionData => {
  const kind =
    question.questionType === 'ability-effects'
      ? 'ability'
      : question.questionType === 'held-item-effects'
        ? 'item'
        : undefined;
  if (!kind) return question;
  const fact = effects?.find(
    (entry) => entry.kind === kind && entry.name === question.subject.name,
  );
  if (!fact) return question;
  const variant = Object.values(fact.questions).find(
    (entry) =>
      entry.correct.value === question.answer.correctOptions[0] &&
      question.options.length === 4 &&
      question.options.every((value) =>
        [entry.correct, ...entry.wrong].some(
          (option) => option.value === value,
        ),
      ),
  );
  return variant
    ? {
        ...question,
        ...getEffectPresentation(fact, formatPokemonName(fact.name), variant),
      }
    : question;
};
