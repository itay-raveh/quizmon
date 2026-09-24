import type { Item } from 'pokenode-ts';
import { buildMedicineChoices } from './medicine-choices.ts';

const item = (name: string, effect: string, category = 'status-cures') =>
  ({
    name,
    category: { name: category },
    effect_entries: [{ language: { name: 'en' }, short_effect: effect }],
  }) as Item;

it('derives cures, healing and safe distractors from item effect text', () => {
  const choices = buildMedicineChoices([
    item('antidote', 'Cures poison.'),
    item('aspear-berry', 'Held: Consumed when frozen to cure frozen.'),
    item('full-restore', 'Restores HP to full and cures any status ailment.'),
    item('potion', 'Restores 20 HP.', 'healing'),
    item(
      'moon-stone',
      'Evolves certain species of Pokemon when used.',
      'evolution',
    ),
  ]);
  expect(choices.find((choice) => choice.name === 'antidote')?.cures).toEqual([
    'poison',
  ]);
  expect(
    choices.find((choice) => choice.name === 'aspear-berry')?.cures,
  ).toEqual(['freeze']);
  expect(
    choices.find((choice) => choice.name === 'full-restore'),
  ).toMatchObject({
    cures: ['poison', 'burn', 'freeze', 'sleep', 'paralysis'],
    hp: 'full',
  });
  expect(choices.find((choice) => choice.name === 'potion')?.hp).toBe(20);
  expect(choices.find((choice) => choice.name === 'moon-stone')?.cures).toEqual(
    [],
  );
});
