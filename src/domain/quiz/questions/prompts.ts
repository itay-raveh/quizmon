import type { QuestionPrompt } from '../types';
import type { Candidate } from './context';

export const textPrompt = (text: string): QuestionPrompt => ({
  kind: 'text',
  text,
});

export const pokemonPrompt = (
  target: Candidate,
  before: string,
  after: string,
): QuestionPrompt => ({
  after,
  before,
  dexNumber: target.pokemon.speciesId,
  kind: 'pokemon',
  name: target.name,
});

// Pokédex prose uses punctuation absent from species keys.
const descriptionNames: Record<string, string> = {
  farfetchd: 'Farfetch’d',
  'mime-jr': 'Mime Jr.',
  'mr-mime': 'Mr. Mime',
  'mr-rime': 'Mr. Rime',
  'nidoran-f': 'Nidoran♀',
  'nidoran-m': 'Nidoran♂',
  sirfetchd: 'Sirfetch’d',
  'type-null': 'Type: Null',
};

export const redactName = (
  description: string,
  name: string,
  speciesName: string,
): string => {
  const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const aliases = [
    name,
    speciesName,
    descriptionNames[speciesName],
    descriptionNames[name],
  ].filter((value): value is string => Boolean(value));
  if (name === 'nidoran-f' || name === 'nidoran-m') aliases.push('nidoran');
  const forms = aliases
    .flatMap((alias) => [alias, alias.replaceAll('-', ' ')])
    .sort((left, right) => right.length - left.length)
    .map((alias) => escapeRegExp(alias).replaceAll('’', "['’]"));
  return description.replace(
    new RegExp(
      `(?<![\\p{L}\\p{N}])(?:${forms.join('|')})(?![\\p{L}\\p{N}])`,
      'giu',
    ),
    'This Pokémon',
  );
};
