import { useCallback, useEffect } from 'react';
import { useGameSounds } from '@/audio/sound';
import { getModeLabel } from '@/game/daily';
import { formatDuration, getCategoryLabel } from '@/game/game';
import type { GameMode, GameResult } from '@/game/types';
import { AnimatedScore } from './AnimatedScore';
import { GameButton } from './GameButton';
import { ShareResultButton } from './ShareResultButton';

interface ResultsProps {
  bestResult: GameResult;
  isNewBest: boolean;
  mode: GameMode;
  onNewGame: () => void;
  result: GameResult;
  resultSaved: boolean;
}

export const Results = ({
  bestResult,
  isNewBest,
  mode,
  onNewGame,
  result,
  resultSaved,
}: ResultsProps) => {
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

  return (
    <section className="results" aria-labelledby="results-title">
      <h1 id="results-title">
        {mode.kind === 'daily' ? 'Trial complete' : 'Training complete'}
      </h1>
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
      </dl>

      <ol className="answer-trail" aria-label="Question results">
        {result.answers.map((answer, index) => (
          <li
            className={answer.correct ? 'answer-trail--correct' : ''}
            key={`${answer.category}-${index}`}
            title={`${getCategoryLabel(answer.category)}: ${answer.correct ? 'correct' : 'incorrect'}`}
          >
            <span aria-hidden="true">{answer.correct ? '✓' : '×'}</span>
            <span className="visually-hidden">
              {getCategoryLabel(answer.category)}:{' '}
              {answer.correct ? 'correct' : 'incorrect'}
            </span>
          </li>
        ))}
      </ol>

      <div className="score" aria-label={`Score ${formatScore(result.score)}`}>
        <span>Score</span>
        <strong>
          <AnimatedScore format={formatScore} value={result.score} />
        </strong>
      </div>

      {mode.kind === 'training' ? (
        <p className="personal-best">
          {isNewBest ? <strong>New best!</strong> : 'Best'}{' '}
          {formatScore(bestResult.score)} points
        </p>
      ) : (
        <p
          className={`personal-best ${resultSaved ? '' : 'personal-best--warning'}`.trim()}
          role={resultSaved ? undefined : 'alert'}
        >
          {resultSaved
            ? 'Saved on this device.'
            : 'This result could not be saved. Keep this tab open or enable browser storage.'}
        </p>
      )}

      <div className="results__actions">
        <ShareResultButton mode={mode} result={result} />
        <GameButton tone="quiet" onClick={onNewGame}>
          {mode.kind === 'daily' ? 'Back to start' : 'Train again'}
        </GameButton>
      </div>
    </section>
  );
};
