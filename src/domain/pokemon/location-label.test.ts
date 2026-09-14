import { formatLocationLabel } from './location-label';

it.each([
  ['Johto Safari Zone (Safari Zone Forest)', 'Johto Safari Zone (Forest)'],
  [
    'Johto Safari Zone (Safari Zone Marshland)',
    'Johto Safari Zone (Marshland)',
  ],
  ['Bell Tower (Bell Tower (Bell Tower (2F)))', 'Bell Tower (2F)'],
  ['Fields of Honor (Fields of Honor)', 'Fields of Honor'],
  [
    'Stony Wilderness (Stony Wilderness (Main Area))',
    'Stony Wilderness (Main Area)',
  ],
  ['Bell Tower (Bell Tower (2F))', 'Bell Tower (2F)'],
  ['Cipher Key Lair (Cipher Key Lair 1F)', 'Cipher Key Lair 1F'],
  [
    'Castelia City (Game Freak HQ 1F (Castelia City))',
    'Game Freak HQ 1F (Castelia City)',
  ],
  ['Pokespot (Cave Pokespot)', 'Cave Pokespot'],
  ['Mt. Coronet (Route 207)', 'Mt. Coronet (Route 207)'],
  ['Route 1 (Route 11 gate)', 'Route 1 (Route 11 gate)'],
  ['Stony Wilderness (Main Area)', 'Stony Wilderness (Main Area)'],
])('formats %s without losing the sub-area', (label, expected) => {
  expect(formatLocationLabel(label)).toBe(expected);
  expect(formatLocationLabel(expected)).toBe(expected);
});
