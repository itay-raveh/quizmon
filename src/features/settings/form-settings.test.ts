import { getFormGroup, getFormGroupGenerations } from '@/domain/pokemon/forms';
import { formGroups } from '@/domain/pokemon/types';
import { getDailySettings } from '@/domain/quiz/daily';
import { getLeagueSettings } from '@/domain/quiz/league';
import { buildQuestions } from '@/domain/quiz/question-generation';
import {
  defaultGameSettings,
  filterPokemon,
  getTrainingSettings,
  normalizeGameSettings,
} from '@/domain/settings/game-settings';
import { createBackup, parseBackup } from '@/features/settings/backup';
import { getTrainingSettingsValidation } from '@/features/settings/settings-validation';
import { createSeededRandom } from '@/lib/random';
import { updatePlayerData } from '@/lib/storage/player-storage';
import { catalog } from '../../../tests/fixtures/catalog';

it('migrates old settings to all form groups and preserves valid selections', () => {
  expect(normalizeGameSettings({ generations: ['I'] }).formGroups).toEqual(
    formGroups,
  );
  expect(
    normalizeGameSettings({ formGroups: ['mega', 'unknown', 'mega'] })
      .formGroups,
  ).toEqual(['mega']);
  expect(normalizeGameSettings({ formGroups: [] }).formGroups).toEqual(
    formGroups,
  );
});

it('derives availability from the shipped forms and their introduction generations', () => {
  expect(getFormGroupGenerations(catalog)).toMatchObject({
    mega: ['VI', 'IX'],
    regional: ['VII', 'VIII', 'IX'],
    gigantamax: ['VIII'],
  });
  const early = filterPokemon(catalog, {
    ...defaultGameSettings,
    generations: ['I', 'II', 'III'],
  });
  expect(early.every(({ name }) => getFormGroup(name) === 'standard')).toBe(
    true,
  );
  const gmax = filterPokemon(catalog, {
    ...defaultGameSettings,
    generations: ['VIII'],
    formGroups: ['gigantamax'],
  });
  expect(gmax.map(({ name }) => name)).toContain('charizard-gmax');
  expect(gmax.every(({ name }) => getFormGroup(name) === 'gigantamax')).toBe(
    true,
  );
  expect(gmax.map(({ name }) => name)).not.toContain('charizard');
  expect(getFormGroup('rotom-wash')).toBe('standard');
  expect(getFormGroup('deoxys-attack')).toBe('standard');
  expect(getFormGroup('groudon-primal')).toBe('standard');
});

it('requires a selected group available in the selected generations', () => {
  const settings = {
    ...defaultGameSettings,
    generations: ['I'] as const,
    formGroups: ['mega'] as const,
  };
  const invalid = getTrainingSettingsValidation(catalog, {
    ...settings,
    generations: [...settings.generations],
    formGroups: [...settings.formGroups],
  });
  expect(invalid).toMatchObject({
    isValid: false,
    formGroupsAreValid: false,
    matchingCount: 0,
  });
  expect(
    getTrainingSettingsValidation(catalog, {
      ...defaultGameSettings,
      formGroups: [],
    }).isValid,
  ).toBe(false);
  expect(
    getTrainingSettingsValidation(catalog, {
      ...defaultGameSettings,
      generations: ['VI'],
      formGroups: ['mega'],
    }).isValid,
  ).toBe(true);
});

it.each(formGroups)(
  'uses only %s forms for Training targets, choices, and search',
  (group) => {
    for (const trainingMode of ['league', 'custom'] as const) {
      const settings = getTrainingSettings({
        ...defaultGameSettings,
        trainingMode,
        formGroups: [group],
      });
      const questions = buildQuestions(
        catalog,
        settings,
        createSeededRandom(`forms-${group}-${trainingMode}`),
      );
      expect(questions).toHaveLength(10);
      for (const question of questions) {
        const names = [
          question.pokemonName,
          ...question.repetition.primary,
          ...question.repetition.distractors,
          ...(question.searchOptions ?? []).map(({ name }) => name),
        ];
        expect(names.every((name) => getFormGroup(name) === group)).toBe(true);
      }
    }
  },
);

it('keeps Daily and the League challenge independent of Training form preferences', () => {
  const settings = {
    ...defaultGameSettings,
    formGroups: ['gigantamax'] as const,
  };
  expect(getDailySettings(settings).formGroups).toEqual(formGroups);
  expect(getLeagueSettings(settings).formGroups).toEqual(formGroups);
});

it('retains form preferences through a backup round trip', () => {
  updatePlayerData({
    settings: { ...defaultGameSettings, formGroups: ['standard', 'regional'] },
  });
  expect(
    parseBackup(JSON.stringify(createBackup())).save.data.settings?.formGroups,
  ).toEqual(['standard', 'regional']);
});
