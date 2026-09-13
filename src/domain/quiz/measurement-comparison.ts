import type { Difficulty } from './difficulty';

const separation: Record<Difficulty, readonly [number, number]> = {
  1: [4, Infinity],
  2: [2, Infinity],
  3: [1.5, Infinity],
  4: [1.2, Infinity],
  5: [1.02, 1.15],
};

export const isMeasurementSeparation = (
  winner: number,
  competitor: number,
  direction: 'highest' | 'lowest',
  difficulty: Difficulty,
) => {
  const [minimum, maximum] = separation[difficulty];
  const numerator = direction === 'highest' ? winner : competitor;
  const denominator = direction === 'highest' ? competitor : winner;
  return (
    numerator >= minimum * denominator && numerator <= maximum * denominator
  );
};

export const measurementWinner = (
  values: readonly number[],
  direction: 'highest' | 'lowest',
  difficulty: Difficulty,
): number | undefined => {
  if (
    values.length !== 4 ||
    values.some((value) => !Number.isFinite(value) || value <= 0) ||
    new Set(values).size !== 4
  )
    return undefined;
  const sorted = values.toSorted((a, b) => a - b);
  const winner = direction === 'highest' ? sorted[3]! : sorted[0]!;
  const competitor = direction === 'highest' ? sorted[2]! : sorted[1]!;
  return isMeasurementSeparation(winner, competitor, direction, difficulty)
    ? values.indexOf(winner)
    : undefined;
};

export const formatMeasurement = (
  value: number,
  measurement: 'height' | 'weight',
): string => `${value / 10} ${measurement === 'height' ? 'm' : 'kg'}`;
