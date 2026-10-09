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
  if (question.visual?.kind === 'evolutionChain') {
    subjects.push(question.visual.before, question.visual.after);
  } else if (question.visual?.kind === 'evolutionGainedType') {
    subjects.push(question.visual.evolution.name);
  }
  switch (question.questionType) {
    case 'champion':
    case 'superEffectiveAttacker':
    case 'evolutionChain':
    case 'pokedexEntryMatch':
    case 'pokemonByGeneration':
    case 'legendaryMythicalSelection':
    case 'typeOddOneOut':
    case 'pokemonFromPixelCrop':
    case 'pokemonIdentification':
    case 'shinyPokemonIdentification':
    case 'pokemonMatch':
    case 'statExtremes':
    case 'pokemonByType':
    case 'dualTypeMatch':
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
