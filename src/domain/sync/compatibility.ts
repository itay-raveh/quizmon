import pokemonGenerations from '../pokemon/data/pokemon-generations.json' with { type: 'json' };
import { scoringRules } from '../quiz/scoring.ts';
import { gameVersions } from '../versions.ts';

const modes = {
  training: { count: 10 },
  daily: { count: 5 },
  league: { count: 15 },
};

export function completionCompatibility(value: Record<string, unknown>) {
  if (
    value.contentVersion !== gameVersions.content ||
    value.scoreVersion !== gameVersions.score ||
    value.progressVersion !== gameVersions.progress ||
    (value.mode !== 'training' &&
      value.mode !== 'daily' &&
      value.mode !== 'league')
  )
    return undefined;
  const mode = modes[value.mode];
  return {
    questionCount: mode.count,
    scoring: scoringRules,
    pokemonGenerations: pokemonGenerations as Record<string, string>,
  };
}
