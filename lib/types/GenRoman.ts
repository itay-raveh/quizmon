export const generations = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
] as const;

export type GenRoman = typeof generations[number];
