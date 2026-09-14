import { formatPokemonName } from '../../pokemon/format';
import type { QuestionData } from '../types';
import type { EvolutionKnowledge } from '../topic-catalog';

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

const evolutionChoiceDetails = (options: readonly string[]) => {
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

const formatEvolutionCondition = (condition: string) => {
  if (condition === 'Level Up') return 'Level up';
  if (condition === 'Use Item') return 'Use item';
  if (condition.startsWith('at level ')) return `Lv. ${condition.slice(9)}+`;
  if (condition.startsWith('with Attack ')) return condition.slice(5);
  return condition.charAt(0).toUpperCase() + condition.slice(1);
};

export const evolutionAnswerSummary = (question: QuestionData): string => {
  const option = question.answer.correctOptions[0]!;
  const { shared, requirements, focused } = evolutionChoiceDetails(
    question.options,
  );
  if (focused && requirements.every(({ kind }) => kind === 'level'))
    return shared
      .filter((part) => part !== 'Level Up')
      .map(formatEvolutionCondition)
      .join(' · ');
  const parts = option.split(' · ');
  const level = parts.find((part) => part.startsWith('at level '));
  const time = parts.find((part) => part.startsWith('during the '));
  const summary = parts
    .filter((part) => !(level && (part === 'Level Up' || part === time)))
    .map((part) =>
      part === level
        ? `Level ${part.slice(9)}+${time ? ` at ${time.slice(11)}` : ''}`
        : formatEvolutionCondition(part),
    );
  return summary.join(' · ');
};

const hasGameSpecificEvolution = (
  question: QuestionData,
  evolutions: readonly EvolutionKnowledge[],
): boolean => {
  const visual = question.visual;
  if (visual?.kind !== 'evolution-endpoints') return true;
  const methods = new Map<string, Set<string>>();
  for (const entry of evolutions) {
    if (entry.before !== visual.before || entry.after !== visual.after)
      continue;
    const gameMethods = methods.get(entry.game) ?? new Set<string>();
    gameMethods.add(
      JSON.stringify([entry.trigger, entry.item, [...entry.conditions].sort()]),
    );
    methods.set(entry.game, gameMethods);
  }
  if (!methods.size) return true;
  return (
    new Set(
      [...methods.values()].map((values) => JSON.stringify([...values].sort())),
    ).size > 1
  );
};

export const presentEvolutionQuestion = (
  question: QuestionData,
  evolutions?: readonly EvolutionKnowledge[],
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
      ...(game &&
      (!evolutions || hasGameSpecificEvolution(question, evolutions))
        ? { supportingText: game }
        : {}),
    },
  };
};
