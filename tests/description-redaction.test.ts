import { redactName } from '@/game/questions/shared';
import { buildDescriptionQuestion } from '@/game/questions/knowledge';
import { buildChampionQuestion } from '@/game/questions/champion';
import { createSeededRandom } from '@/game/random';
import { catalog } from './fixtures/catalog';

it.each([
  ['tatsugiri-curly', 'Tatsugiri'],
  ['deoxys-normal', 'DEOXYS'],
  ['giratina-altered', 'Giratina'],
  ['basculin-red-striped', 'Basculin'],
  ['maushold-family-of-four', 'Maushold'],
  ['mr-mime', 'Mr. Mime'],
  ['mime-jr', 'Mime Jr.'],
  ['type-null', 'Type: Null'],
  ['farfetchd', 'Farfetch’d'],
  ['farfetchd', "Farfetch'd"],
  ['sirfetchd', 'Sirfetch’d'],
  ['nidoran-f', 'Nidoran♀'],
  ['nidoran-f', 'Nidoran'],
  ['ho-oh', 'Ho-Oh'],
  ['iron-hands', 'Iron Hands'],
])('redacts the description name for %s', (name, alias) => {
  expect(redactName(`${alias} appears. ${alias} hides.`, name)).toBe(
    'This Pokémon appears. This Pokémon hides.',
  );
});

it('matches the full variety before the shorter species name', () => {
  expect(
    redactName('Tatsugiri Curly and tatsugiri-curly.', 'tatsugiri-curly'),
  ).toBe('This Pokémon and This Pokémon.');
});

it('preserves other species and words containing the name', () => {
  expect(redactName('Mewtwo meets Mew near a mewing Pokémon.', 'mew')).toBe(
    'Mewtwo meets This Pokémon near a mewing Pokémon.',
  );
  expect(redactName('Tatsugiri rides inside Dondozo.', 'tatsugiri-curly')).toBe(
    'This Pokémon rides inside Dondozo.',
  );
  expect(redactName('Its iron body is tough.', 'iron-hands')).toBe(
    'Its iron body is tough.',
  );
});

it('retains possessive punctuation', () => {
  expect(redactName('Giratina’s shadow.', 'giratina-altered')).toBe(
    'This Pokémon’s shadow.',
  );
});

it.each([buildDescriptionQuestion, buildChampionQuestion])(
  'conceals the species name in the generated opening clue',
  (build) => {
    const names = ['tatsugiri-curly', 'dondozo', 'dewgong', 'barraskewda'];
    const pool = names.map((name) => ({
      name,
      pokemon:
        name === 'tatsugiri-curly'
          ? {
              ...catalog.pokemon[name]!,
              hasDistinctDescription: true,
              description:
                'Tatsugiri is an extremely cunning Pokémon. It feigns weakness to lure in prey, then orders its partner to attack.',
            }
          : { ...catalog.pokemon[name]!, description: '' },
    }));
    const question = build({
      catalog,
      pool,
      used: new Set(),
      random: createSeededRandom('redaction'),
    });
    expect(question?.pokemonName).toBe('tatsugiri-curly');
    expect(question?.prompt).toEqual({
      kind: 'text',
      text: '“This Pokémon is an extremely cunning Pokémon. It feigns weakness to lure in prey, then orders its partner to attack.”',
    });
    expect(question?.answer.correctOptions).toEqual(['tatsugiri-curly']);
  },
);
