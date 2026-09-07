import { readPlayerSave, updatePlayerData } from './player-storage';
import type { QuestionData } from './types';

export const getQuestionPokemon = (
  question: QuestionData,
  includeDistractors = false,
): string[] => {
  const subjects = [question.pokemonName];
  if (question.visual?.kind === 'evolution-link') {
    subjects.push(question.visual.before, question.visual.after);
  } else if (question.visual?.kind === 'evolution-shift') {
    subjects.push(question.visual.evolution.name);
  }

  switch (question.questionType) {
    case 'ability-check':
    case 'move-check':
    case 'type-check':
    case 'type-matchup':
    case 'evolution-shift':
      return [...new Set(subjects)];
    case 'champion':
    case 'counter-pick':
    case 'evolution-link':
    case 'field-notes':
    case 'generation-roundup':
    case 'legend-hunt':
    case 'odd-one-out':
    case 'pixel-peek':
    case 'pokedex-scan':
    case 'shiny-spotter':
    case 'silhouette-match':
    case 'stat-showdown':
    case 'type-roundup':
    case 'type-twins':
      return [
        ...new Set([
          ...subjects,
          ...(includeDistractors
            ? question.options
            : question.answer.correctOptions),
        ]),
      ];
  }
};

export const registerPokedexAnswer = (
  question: QuestionData,
  correct: boolean,
): boolean => {
  if (!correct) return false;
  try {
    const existing = readPlayerSave().data.pokedex;
    const pokedex = [
      ...new Set([...existing, ...getQuestionPokemon(question)]),
    ];
    return pokedex.length === existing.length || updatePlayerData({ pokedex });
  } catch {
    return false;
  }
};
