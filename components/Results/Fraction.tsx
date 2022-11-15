import type { FC } from 'react';

interface FractionProps {
  numerator: React.ReactNode;
  denominator: React.ReactNode;
}

const FRACTION_SLASH = <>&frasl;</>;

const Fraction: FC<FractionProps> = ({ numerator, denominator }) => (
  <>
    <sup>{numerator}</sup>
    {FRACTION_SLASH}
    <sub>{denominator}</sub>
  </>
);

export default Fraction;
