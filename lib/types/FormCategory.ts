export const knownFormCategories = [
  'mega',
  'gmax',
  'hisui',
  'galar',
  'alola',
] as const;

export const formCategories = [
  'default',
  ...knownFormCategories,
  'other',
] as const;

export type FormCategory = typeof formCategories[number];
