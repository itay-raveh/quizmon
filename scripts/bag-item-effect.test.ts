import { bagItemEffect } from './bag-item-effect.ts';

it('keeps usable PokéAPI bag effects separate from Showdown held items', () => {
  expect(bagItemEffect('potion', 'Restores 20 HP.')).toBe('Restores 20 HP.');
  expect(bagItemEffect('poke-ball', 'Catches a wild Pokémon.')).toBe(
    'Catches a wild Pokémon.',
  );
  expect(bagItemEffect('leftovers', 'Restores HP.')).toBeUndefined();
  expect(bagItemEffect('tm06', 'Teaches Toxic.')).toBeUndefined();
  expect(
    bagItemEffect('god-stone', 'Unknown. Currently unused.'),
  ).toBeUndefined();
  expect(
    bagItemEffect('shoal-salt', 'No effect. Can be traded.'),
  ).toBeUndefined();
  expect(bagItemEffect('unused', 'XXX new effect')).toBeUndefined();
  expect(bagItemEffect('unused', 'Gen III: Restores HP.')).toBeUndefined();
});
