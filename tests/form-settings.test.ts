import { catalog } from './fixtures/catalog';
import { getFormGroup, getFormGroupGenerations } from '@/game/forms';
import {
  defaultModifiers,
  filterPokemon,
  getTrainingModifiers,
  normalizeModifiers,
} from '@/game/modifiers';
import { formGroups } from '@/game/types';
import { getTrainingSettingsValidation } from '@/components/trainingSettingsModel';
import { getDailyModifiers } from '@/game/daily';
import { getLeagueModifiers } from '@/game/league';
import { buildQuestions } from '@/game/game';
import { createSeededRandom } from '@/game/random';
import { createBackup, parseBackup } from '@/game/backup';
import { updatePlayerData } from '@/game/player-storage';

it('migrates old settings to all form groups and preserves valid selections', () => {
  expect(normalizeModifiers({ generations: ['I'] }).formGroups).toEqual(
    formGroups,
  );
  expect(
    normalizeModifiers({ formGroups: ['mega', 'unknown', 'mega'] }).formGroups,
  ).toEqual(['mega']);
  expect(normalizeModifiers({ formGroups: [] }).formGroups).toEqual(formGroups);
});

it('derives availability from the shipped forms and their introduction generations', () => {
  expect(getFormGroupGenerations(catalog)).toMatchObject({
    mega: ['VI', 'IX'],
    regional: ['VII', 'VIII', 'IX'],
    gigantamax: ['VIII'],
  });
  const early = filterPokemon(catalog, {
    ...defaultModifiers,
    generations: ['I', 'II', 'III'],
  });
  expect(early.every(({ name }) => getFormGroup(name) === 'standard')).toBe(
    true,
  );
  const gmax = filterPokemon(catalog, {
    ...defaultModifiers,
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
    ...defaultModifiers,
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
      ...defaultModifiers,
      formGroups: [],
    }).isValid,
  ).toBe(false);
  expect(
    getTrainingSettingsValidation(catalog, {
      ...defaultModifiers,
      generations: ['VI'],
      formGroups: ['mega'],
    }).isValid,
  ).toBe(true);
});

it.each(formGroups)(
  'uses only %s forms for Training targets, choices, and search',
  (group) => {
    for (const trainingMode of ['league', 'custom'] as const) {
      const settings = getTrainingModifiers({
        ...defaultModifiers,
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
  const settings = { ...defaultModifiers, formGroups: ['gigantamax'] as const };
  expect(getDailyModifiers(settings).formGroups).toEqual(formGroups);
  expect(getLeagueModifiers(settings).formGroups).toEqual(formGroups);
});

it('retains form preferences through a backup round trip', () => {
  updatePlayerData({
    settings: { ...defaultModifiers, formGroups: ['standard', 'regional'] },
  });
  expect(
    parseBackup(JSON.stringify(createBackup())).save.data.settings?.formGroups,
  ).toEqual(['standard', 'regional']);
});
