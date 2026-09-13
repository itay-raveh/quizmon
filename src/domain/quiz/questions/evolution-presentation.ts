import { formatPokemonName } from '../../pokemon/format';
import type { QuestionData } from '../types';

export const evolutionRequirement = (condition: string) => {
  const level = /^at level (\d+)$/.exec(condition);
  if (level)
    return {
      kind: 'level',
      label: level[1]!,
      question: 'What’s the minimum evolution level?',
      value: Number(level[1]),
    };
  const patterns = [
    ['holding ', 'held-item', 'Which item must it hold?'],
    ['use ', 'item', 'Which item triggers this evolution?'],
    ['at ', 'location', 'Where must it level up?'],
    ['knowing ', 'move', 'Which move must it know?'],
    ['during the ', 'time', 'When must it level up?'],
    ['in ', 'region', 'Where does this evolution happen?'],
    ['as a ', 'gender', 'Which gender can evolve?'],
    ['with Attack ', 'stats', 'How must Attack compare with Defense?'],
  ] as const;
  for (const [prefix, kind, question] of patterns) {
    if (!condition.startsWith(prefix)) continue;
    const label =
      kind === 'stats'
        ? condition.slice(5)
        : formatPokemonName(
            condition.slice(prefix.length).replaceAll(' ', '-'),
          );
    return { kind, label, question, value: undefined };
  }
  return {
    kind: condition.replace(/\d+/g, '#'),
    label: condition,
    question: 'Which requirement completes this evolution?',
    value: undefined,
  };
};

export const evolutionChoiceDetails = (options: readonly string[]) => {
  const parts = options.map((option) => option.split(' · '));
  const shared = (parts[0] ?? []).filter((part) =>
    parts.every((values) => values.includes(part)),
  );
  const missing = parts.map((values) =>
    values.filter((part) => !shared.includes(part)),
  );
  const single = missing.every((values) => values.length === 1);
  const requirements = missing.map((values) =>
    evolutionRequirement(values.join(' · ')),
  );
  const focused =
    single &&
    requirements.every((value) => value.kind === requirements[0]?.kind);
  return { shared, missing, requirements, focused };
};

export const formatEvolutionCondition = (condition: string) => {
  if (condition === 'Level Up') return 'Level up';
  if (condition === 'Use Item') return 'Use item';
  if (condition.startsWith('at level ')) return `Lv. ${condition.slice(9)}+`;
  if (condition.startsWith('with Attack ')) return condition.slice(5);
  return condition.charAt(0).toUpperCase() + condition.slice(1);
};

export const presentEvolutionQuestion = (
  question: QuestionData,
): QuestionData => {
  if (question.questionType !== 'evolution-conditions') return question;
  const { shared, missing, requirements, focused } = evolutionChoiceDetails(
    question.options,
  );
  const optionLabels = Object.fromEntries(
    question.options.map((option, index) => [
      option,
      focused
        ? question.optionLabels?.[option] &&
          question.optionLabels[option] !== option &&
          question.optionLabels[option] !== missing[index]![0]
          ? question.optionLabels[option]
          : requirements[index]!.label
        : missing[index]!.map(formatEvolutionCondition).join(' · '),
    ]),
  );
  const numeric =
    focused && requirements.every(({ value }) => value !== undefined);
  const game =
    question.prompt.supportingText?.split(' · ')[0] ??
    (question.prompt.kind === 'text'
      ? /^In (Pokémon [^,]+),/.exec(question.prompt.text)?.[1]
      : undefined);
  return {
    ...question,
    namesOnly: false,
    options: numeric
      ? question.options.toSorted(
          (a, b) => Number(optionLabels[a]) - Number(optionLabels[b]),
        )
      : question.options,
    optionLabels,
    prompt: {
      kind: 'text',
      text: focused
        ? requirements[0]!.question
        : shared.length
          ? 'Which requirement completes this evolution?'
          : 'How does this Pokémon evolve?',
      ...(game ? { supportingText: game } : {}),
    },
  };
};
