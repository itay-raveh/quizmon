import { useCallback, useEffect } from 'react';
import useSound from 'use-sound';
import { calculateScore, formatDuration } from '@/lib/game';
import type { Modifiers } from '@/lib/types';
import { AnimatedScore } from './AnimatedScore';
import { GameButton } from './GameButton';

const SCORE_SOUND = '/assets/sounds/prize-wheel-spin.mp3';

interface ResultsProps {
  correctCount: number;
  elapsedSeconds: number;
  modifiers: Modifiers;
  onNewGame: () => void;
  questionCount: number;
}

export const Results = ({
  correctCount,
  elapsedSeconds,
  modifiers,
  onNewGame,
  questionCount,
}: ResultsProps) => {
  const score = calculateScore(
    correctCount,
    questionCount,
    elapsedSeconds,
    modifiers,
  );
  const [playScore, { stop: stopScore }] = useSound(SCORE_SOUND);

  useEffect(() => {
    if (score > 1) playScore();
    return stopScore;
  }, [playScore, score, stopScore]);

  const formatScore = useCallback(
    (value: number) =>
      Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value),
    [],
  );

  return (
    <section className="results" aria-labelledby="results-title">
      <p className="eyebrow">Run complete</p>
      <h1 id="results-title">Results</h1>

      <dl className="results-list">
        <div>
          <dt>Accuracy</dt>
          <dd>{((correctCount / questionCount) * 100).toFixed(2)}%</dd>
          <dd className="results-list__detail">
            {correctCount} / {questionCount}
          </dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatDuration(elapsedSeconds)}</dd>
          <dd className="results-list__detail">
            {Math.max(1, elapsedSeconds)} seconds
          </dd>
        </div>
        {modifiers.whosThatPokemon ? (
          <div>
            <dt>Silhouette</dt>
            <dd>×{correctCount}</dd>
          </div>
        ) : null}
        {modifiers.randomSprite ? (
          <div>
            <dt>Random sprite</dt>
            <dd>×{correctCount}</dd>
          </div>
        ) : null}
      </dl>

      <div className="score" aria-label={`Score ${formatScore(score)}`}>
        <span>Score</span>
        <strong>
          <AnimatedScore format={formatScore} value={score} />
        </strong>
      </div>

      <GameButton onClick={onNewGame}>New game</GameButton>
    </section>
  );
};
