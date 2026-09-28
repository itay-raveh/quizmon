import type { QuestionData } from './types.ts';
export const getQuestionPokemon = (
  question: QuestionData,
  includeDistractors = false,
): string[] => {
  if (question.optionLabels)
    return [
      ...new Set([
        ...question.repetition.primary,
        ...(includeDistractors ? question.repetition.distractors : []),
      ]),
    ];
  const subjects =
    question.subject.kind === 'pokemon' ? [question.subject.name] : [];
  if (question.visual?.kind === 'evolution-chain') {
    subjects.push(question.visual.before, question.visual.after);
  } else if (question.visual?.kind === 'evolution-gained-type') {
    subjects.push(question.visual.evolution.name);
  }
  switch (question.questionType) {
    case 'champion':
    case 'super-effective-attacker':
    case 'evolution-chain':
    case 'pokedex-entry-match':
    case 'pokemon-by-generation':
    case 'legendary-mythical-selection':
    case 'type-odd-one-out':
    case 'pokemon-from-pixel-crop':
    case 'pokemon-from-historical-sprite':
    case 'shiny-pokemon-identification':
    case 'silhouette-for-pokemon':
    case 'sprite-for-pokemon':
    case 'pokemon-from-silhouette':
    case 'stat-extremes':
    case 'pokemon-by-type':
    case 'dual-type-match':
      return [
        ...new Set([
          ...subjects,
          ...(includeDistractors
            ? question.options
            : question.answer.correctOptions),
        ]),
      ];
    default:
      return [...new Set(subjects)];
  }
};
