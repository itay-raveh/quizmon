import { catalog } from './catalog';
import { formGroups, generations } from '../../src/domain/pokemon/types';
import { defaultGameSettings } from '../../src/domain/settings/game-settings';
import {
  buildDailyTrackQuestions,
  resolveTrainingSettings,
} from '../../src/domain/quiz/question-generation';

export const dailySettings = resolveTrainingSettings(catalog, {
  ...defaultGameSettings,
  difficulty: 3,
  generations: [...generations],
  formGroups: [...formGroups],
  questionSelection: 'automatic',
});
export const buildDailyForTest = (date: string) =>
  buildDailyTrackQuestions(catalog, date, dailySettings, 'all');
