export interface MeasurementRules {
  minimumRatio: number;
  maximumRatio: number;
  maximumSpread: number;
}

export const isMeasurementSeparation = (
  winner: number,
  competitor: number,
  direction: 'highest' | 'lowest',
  rules: MeasurementRules,
) => {
  const { minimumRatio: minimum, maximumRatio: maximum } = rules;
  const numerator = direction === 'highest' ? winner : competitor;
  const denominator = direction === 'highest' ? competitor : winner;
  const ratio = numerator / denominator;
  return ratio >= minimum && ratio <= maximum;
};

export const isMeasurementClusterMember = (
  winner: number,
  competitor: number,
  direction: 'highest' | 'lowest',
  rules: MeasurementRules,
) => {
  const maximum = rules.maximumSpread;
  return direction === 'highest'
    ? winner / competitor <= maximum
    : competitor / winner <= maximum;
};

export const measurementWinner = (
  values: readonly number[],
  direction: 'highest' | 'lowest',
  rules: MeasurementRules,
): number | undefined => {
  if (values.length !== 4) return undefined;
  const sorted = values.toSorted((a, b) => a - b);
  const winner = direction === 'highest' ? sorted[3]! : sorted[0]!;
  const competitor = direction === 'highest' ? sorted[2]! : sorted[1]!;
  return isMeasurementSeparation(winner, competitor, direction, rules) &&
    values.every((value) =>
      isMeasurementClusterMember(winner, value, direction, rules),
    )
    ? values.indexOf(winner)
    : undefined;
};

export const formatMeasurement = (
  value: number,
  measurement: 'height' | 'weight',
): string => `${value / 10} ${measurement === 'height' ? 'm' : 'kg'}`;
