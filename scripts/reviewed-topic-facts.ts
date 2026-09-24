import type { TopicCatalog } from '../src/domain/quiz/topic-catalog.ts';

const allStatuses = ['poison', 'burn', 'freeze', 'sleep', 'paralysis'];
const medicineSource =
  'https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/item_prose.csv';
export const medicineChoices: TopicCatalog['medicineChoices'] = [
  ...[
    ['antidote', 'poison'],
    ['burn-heal', 'burn'],
    ['ice-heal', 'freeze'],
    ['awakening', 'sleep'],
    ['paralyze-heal', 'paralysis'],
    ['pecha-berry', 'poison'],
    ['rawst-berry', 'burn'],
    ['aspear-berry', 'freeze'],
    ['chesto-berry', 'sleep'],
    ['cheri-berry', 'paralysis'],
  ].map(([name, status]) => ({
    name: name!,
    cures: [status!],
    hp: 0,
    source: medicineSource,
  })),
  ...[
    'full-heal',
    'lum-berry',
    'lava-cookie',
    'old-gateau',
    'casteliacone',
    'heal-powder',
  ].map((name) => ({
    name,
    cures: allStatuses,
    hp: 0,
    source: medicineSource,
  })),
  {
    name: 'full-restore',
    cures: allStatuses,
    hp: 'full',
    source: medicineSource,
  },
  { name: 'max-potion', cures: [], hp: 'full', source: medicineSource },
  { name: 'potion', cures: [], hp: 20, source: medicineSource },
  { name: 'poke-ball', cures: [], hp: 0, source: medicineSource },
  { name: 'moon-stone', cures: [], hp: 0, source: medicineSource },
];

export const reviewedMoveDescriptions: Record<string, string> = {
  pound: 'The user strikes the target with its forelegs or tail.',
  spark: 'The user tackles the target with an electric charge.',
  'aerial-ace': 'The user slashes the target at high speed.',
  'bullet-punch': 'The user punches quickly, like a flying bullet.',
  scald: 'The user attacks with boiling water.',
  moonblast: 'The user attacks with the power of the moon.',
  'sparkling-aria': 'The user sings and releases bubbles.',
  'snipe-shot':
    'The user aims a shot at a chosen target, ignoring moves and abilities that draw attacks away.',
  'torch-song': 'The user sends out flames while singing.',
};
