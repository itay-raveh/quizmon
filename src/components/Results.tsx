import { useCallback, useEffect, useState } from 'react';
import { useGameSounds } from '@/audio/sound';
import { getModeLabel } from '@/game/daily';
import { formatDuration } from '@/game/game';
import { shareResult } from '@/game/share';
import type { GameMode, GameResult, Modifiers } from '@/game/types';
import { AnimatedScore } from './AnimatedScore';
import { GameButton } from './GameButton';

interface ResultsProps {
  bestResult: GameResult;
  isNewBest: boolean;
  mode: GameMode;
  modifiers: Modifiers;
  onNewGame: () => void;
  result: GameResult;
}

export const Results = ({
  bestResult,
  isNewBest,
  mode,
  modifiers,
  onNewGame,
  result,
}: ResultsProps) => {
  const [shareStatus, setShareStatus] = useState('');
  const { playScore, stopScore } = useGameSounds();

  useEffect(() => {
    if (result.score > 1) playScore();
    return stopScore;
  }, [playScore, result.score, stopScore]);

  const formatScore = useCallback(
    (value: number) =>
      Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value),
    [],
  );

  const handleShare = async () => {
    try {
      const status = await shareResult(mode, result);
      setShareStatus(
        status === 'copied'
          ? 'Result copied to the clipboard.'
          : status === 'shared'
            ? 'Result shared.'
            : '',
      );
    } catch {
      setShareStatus('Could not share this result.');
    }
  };

  return (
    <section className="results" aria-labelledby="results-title">
      <h1 id="results-title">Results</h1>
      <p className="game-mode">{getModeLabel(mode)}</p>

      <dl className="results-list">
        <div>
          <dt>Accuracy</dt>
          <dd>
            {((result.correctCount / result.questionCount) * 100).toFixed(2)}%
          </dd>
          <dd className="results-list__detail">
            {result.correctCount} / {result.questionCount}
          </dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatDuration(result.elapsedSeconds)}</dd>
          <dd className="results-list__detail">
            {Math.max(1, result.elapsedSeconds)} seconds
          </dd>
        </div>
        {modifiers.whosThatPokemon ? (
          <div>
            <dt>Silhouette</dt>
            <dd>×{result.correctCount}</dd>
          </div>
        ) : null}
        {modifiers.randomSprite ? (
          <div>
            <dt>Random sprite</dt>
            <dd>×{result.correctCount}</dd>
          </div>
        ) : null}
      </dl>

      <div className="score" aria-label={`Score ${formatScore(result.score)}`}>
        <span>Score</span>
        <strong>
          <AnimatedScore format={formatScore} value={result.score} />
        </strong>
      </div>

      <p className="personal-best">
        {isNewBest ? <strong>New best!</strong> : 'Best'}{' '}
        {formatScore(bestResult.score)} points
      </p>

      <div className="results__actions">
        <GameButton onClick={() => void handleShare()}>Share result</GameButton>
        <GameButton tone="quiet" onClick={onNewGame}>
          New game
        </GameButton>
      </div>
      <p className="share-status" aria-live="polite">
        {shareStatus}
      </p>
    </section>
  );
};
