import type { PokemonCatalog } from '../pokemon/types.ts';
import { formGroups, generations } from '../pokemon/types.ts';
import { defaultGameSettings } from '../settings/game-settings.ts';
import { currentDailyTrack } from './daily-track.ts';
import {
  buildDailyTrackQuestions,
  resolveTrainingSettings,
} from './question-generation.ts';
import type { QuestionData } from './types.ts';

export async function getPuzzleId(questions: readonly QuestionData[]) {
  const encoded = new TextEncoder().encode(
    JSON.stringify(
      questions.map((question) => ({
        ...question,
        assistanceUsed: undefined,
        rulesVersion: undefined,
      })),
    ),
  );
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function getDailyPuzzleId(catalog: PokemonCatalog, date: string) {
  const settings = resolveTrainingSettings(catalog, {
    ...defaultGameSettings,
    difficulty: currentDailyTrack.difficulty,
    generations: [...generations],
    formGroups: [...formGroups],
    questionSelection: 'automatic',
  });
  return getPuzzleId(
    buildDailyTrackQuestions(catalog, date, settings, currentDailyTrack.scope),
  );
}
