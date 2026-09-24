import type { EffectKnowledge, EffectQuestion } from '../topic-catalog.ts';

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
  optionDetails: Object.fromEntries(
    [variant.correct, ...variant.wrong].flatMap(({ value, details }) =>
      details ? [[value, details]] : [],
    ),
  ),
  optionLabels: Object.fromEntries(
    [variant.correct, ...variant.wrong].map(({ value, label }) => [
      value,
      label,
    ]),
  ),
});
