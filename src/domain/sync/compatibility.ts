import pokemonGenerations from '../pokemon/data/pokemon-generations.json' with { type: 'json' };
import { scoringRules } from '../quiz/scoring.ts';
import { gameVersions } from '../versions.ts';
import { isRecord } from '../../lib/validation.ts';

const modes = {
  training: { generator: 0, count: 10 },
  daily: { generator: gameVersions.daily, count: 5 },
  league: { generator: gameVersions.league, count: 15 },
};

export function completionCompatibility(value: Record<string, unknown>) {
  const result = isRecord(value.result) ? value.result : undefined;
  const rules = isRecord(result?.rules) ? result.rules.version : undefined;
  if (
    value.contentVersion !== gameVersions.content ||
    value.scoreVersion !== gameVersions.score ||
    value.progressVersion !== gameVersions.progress ||
    rules !== gameVersions.questions ||
    (value.mode !== 'training' &&
      value.mode !== 'daily' &&
      value.mode !== 'league')
  )
    return undefined;
  const mode = modes[value.mode];
  return value.generatorVersion === mode.generator
    ? {
        questionCount: mode.count,
        scoring: scoringRules,
        pokemonGenerations: pokemonGenerations as Record<string, string>,
      }
    : undefined;
}
