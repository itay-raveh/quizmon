import { gameLevels, type Level } from '@/domain/quiz/level';
import type { TrainingQuestionUnavailableReason } from '@/domain/quiz/question-generation';

const formatAvailableLevels = (levels: readonly Level[]): string => {
  const ranges: Level[][] = [];
  for (const level of levels) {
    const range = ranges.at(-1);
    if (
      range &&
      gameLevels.indexOf(level) === gameLevels.indexOf(range.at(-1)!) + 1
    )
      range.push(level);
    else ranges.push([level]);
  }
  if (!ranges.length) return 'No configured levels';
  if (ranges.length === 1) {
    const first = levels[0]!;
    const last = levels.at(-1)!;
    if (first === last) return `Available at Level ${first}`;
    if (last === gameLevels.at(-1)) return `Available from Level ${first}`;
    if (first === gameLevels[0]) return `Available up to Level ${last}`;
  }
  return `Available at Levels ${ranges
    .map((range) =>
      range.length === 1 ? `${range[0]}` : `${range[0]}–${range.at(-1)}`,
    )
    .join(' or ')}`;
};

export const formatQuestionUnavailableReason = (
  reason: TrainingQuestionUnavailableReason,
): string => {
  switch (reason.kind) {
    case 'choose-level':
      return 'Choose a level';
    case 'levels':
      return formatAvailableLevels(reason.levels);
    case 'generations':
      return `Select at least ${reason.minimum} generations`;
    case 'no-pokemon':
      return 'No Pokémon match these generations and forms';
    case 'content':
      return 'Not enough eligible content for these settings';
  }
};
