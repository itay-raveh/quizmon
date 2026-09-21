export const english = (value: { language: { name: string } }) =>
  value.language.name === 'en';

export const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

export const titleCase = (value: string) =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
