import type { GameMode } from '../quiz/types';
import pokemonLabels from './data/pokemon-labels.json' with { type: 'json' };
import type { Generation } from './types';

const scoreFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const dailyDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

export const formatPokemonName = (name: string): string =>
  (pokemonLabels as Record<string, string>)[name] ??
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const formatPokedexNumber = (dexNumber: number): string =>
  `No. ${String(dexNumber).padStart(4, '0')}`;

export const formatPokemonTypes = (types: readonly string[]): string =>
  types.map(formatPokemonName).join(' and ');

export const formatTypeMultiplier = (multiplier: number): string =>
  ({ 0.25: '¼', 0.5: '½' })[multiplier] ?? String(multiplier);

export const formatScore = (score: number): string =>
  scoreFormatter.format(score);

export const formatGeneration = (generation: Generation): string =>
  `Generation ${generation}`;

export const formatDailyDate = (date: string): string =>
  dailyDateFormatter.format(new Date(`${date}T00:00:00.000Z`));

export const formatDuration = (
  elapsedSeconds: number,
  unit: 'hours' | 'minutes' = 'hours',
): string => {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return (
    unit === 'minutes'
      ? [Math.floor(elapsedSeconds / 60), seconds]
      : [hours, minutes, seconds]
  )
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};

export const formatDurationMilliseconds = (
  elapsedMilliseconds: number,
  unit: 'hours' | 'minutes' = 'hours',
): string =>
  `${formatDuration(Math.floor(elapsedMilliseconds / 1000), unit)}.${String(
    Math.floor(elapsedMilliseconds % 1000),
  ).padStart(3, '0')}`;

export const getModeLabel = (mode: GameMode): string =>
  mode.kind === 'daily'
    ? `Daily Challenge · ${formatDailyDate(mode.date)}`
    : mode.kind === 'league'
      ? 'Quizmon League'
      : 'Training';
