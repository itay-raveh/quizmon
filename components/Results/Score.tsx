import { useCallback, type FC } from 'react';
import CountUp from 'react-countup';
import Item from './Item';

interface ScoreProps {
  score: number;
}

const Score: FC<ScoreProps> = ({ score }) => {
  const formattingFn = useCallback(
    (value: number) =>
      Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value),
    []
  );

  return (
    <Item
      title='Score'
      points={<CountUp end={score} formattingFn={formattingFn} />}
      bold
    />
  );
};

export default Score;
