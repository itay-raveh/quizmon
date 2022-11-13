import prizeWheelSpin from 'public/sounds/prize-wheel-spin.mp3';
import { useCallback, useEffect, type FC } from 'react';
import CountUp from 'react-countup';
import useSound from 'use-sound';
import Item from './Item';

interface ScoreProps {
  score: number;
}

const Score: FC<ScoreProps> = ({ score }) => {
  const [playScore, { stop: stopScore }] = useSound(prizeWheelSpin);

  useEffect(() => {
    {
      score > 1 && playScore();
      return stopScore;
    }
  }, [playScore, score, stopScore]);

  const formattingFn = useCallback(
    (value: number) =>
      Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value),
    []
  );

  return (
    <Item
      title='Score:'
      points={
        <CountUp end={score} formattingFn={formattingFn} enableScrollSpy />
      }
      bold
    />
  );
};

export default Score;
