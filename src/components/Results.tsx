import { useEffect, useRef } from 'react';
import { useGameSounds } from '@/audio/sound';
import { getCategoryLabel } from '@/game/question-labels';
import { getScoreBreakdown } from '@/game/scoring';
import { getLeagueStage, isLeagueVictory } from '@/game/league';
import {
  formatDailyDate,
  formatDuration,
  formatDurationMilliseconds,
  formatScore,
} from '@/game/format';
import { getHighScoreKey } from '@/game/storage';
import type { TrainerProgressChange, TrainerView } from '@/game/trainer';
import type { GameMode, GameResult, Modifiers } from '@/game/types';
import { AnimatedScore } from './AnimatedScore';
import { CatchCombo } from './CatchCombo';
import { DailyReminderPrompt } from './DailyReminderPrompt';
import { GameButton } from './GameButton';
import { CheckIcon, XIcon } from './icons';
import { ShareResultButton } from './ShareResultButton';
import { TrainerProgressSummary } from './TrainerProgressSummary';

interface ResultStat {
  label: string;
  value: string;
  className?: string;
}

interface ResultsProps {
  bestResult: GameResult;
  dailyStreak: number;
  isNewBest: boolean;
  mode: GameMode;
  modifiers: Modifiers;
  onNewGame: () => void;
  onOpenHallOfFame: () => void;
  onOpenTrainerCard: (view: TrainerView) => void;
  onTrainAgain: () => void;
  onStartTraining: () => void;
  onRetryLeague: () => void;
  result: GameResult;
  resultSaved: boolean;
  progressChanges: TrainerProgressChange[];
}

export const Results = ({
  bestResult,
  dailyStreak,
  isNewBest,
  mode,
  modifiers,
  onNewGame,
  onOpenTrainerCard,
  onOpenHallOfFame,
  onTrainAgain,
  onStartTraining,
  onRetryLeague,
  result,
  resultSaved,
  progressChanges,
}: ResultsProps) => {
  const { playPerfect, playResults, playScoreCount, stopCelebration } =
    useGameSounds();
  const heading = useRef<HTMLHeadingElement>(null);
  const leagueVictory = mode.kind === 'league' && isLeagueVictory(result);
  const score = getScoreBreakdown(result.answers);
  const resultStats: ResultStat[] = [
    ...(mode.kind === 'league' && !leagueVictory
      ? [
          {
            label: 'Reached',
            value: getLeagueStage(result.answers.length).heading,
            className: 'results-list__stage',
          },
        ]
      : []),
    ...(result.questionCount > 10
      ? [
          {
            label: 'Correct',
            value: `${result.correctCount} / ${result.questionCount}`,
          },
        ]
      : []),
    {
      label: 'Time',
      value:
        modifiers.timerDisplay === 'milliseconds' &&
        result.elapsedMilliseconds !== undefined
          ? formatDurationMilliseconds(result.elapsedMilliseconds)
          : formatDuration(result.elapsedSeconds),
    },
    {
      label: 'Knowledge',
      value: formatScore(score.knowledge),
    },
    { label: 'Speed', value: formatScore(score.speed) },
    { label: 'Mastery', value: formatScore(score.mastery) },
  ];
  const highScoreKey = getHighScoreKey(mode, modifiers);
  const highScoreLabel = highScoreKey
    ? { custom: 'Custom', daily: 'Daily', league: 'League' }[highScoreKey]
    : null;
  const resultTitle =
    mode.kind === 'daily'
      ? 'Daily complete'
      : mode.kind === 'league'
        ? leagueVictory
          ? 'League Champion'
          : 'League challenge ended'
        : 'Training complete';

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    if (result.correctCount === result.questionCount) playPerfect();
    else if (result.score > 0) playResults();

    if (result.score > 0) playScoreCount();
    return stopCelebration;
  }, [
    playPerfect,
    playResults,
    playScoreCount,
    result.correctCount,
    result.questionCount,
    result.score,
    stopCelebration,
  ]);

  return (
    <section className="results" aria-labelledby="results-title">
      <div className="results__header">
        <GameButton
          aria-label="Back to start"
          className="results__close"
          onClick={onNewGame}
          title="Back to start"
          tone="quiet"
        >
          <XIcon aria-hidden="true" weight="bold" />
        </GameButton>
        <h1 id="results-title" ref={heading} tabIndex={-1}>
          {resultTitle}
        </h1>
      </div>
      {mode.kind === 'daily' ? (
        <div className="results__daily-meta">
          <p className="game-mode">{formatDailyDate(mode.date)}</p>
          {dailyStreak > 0 ? (
            <CatchCombo celebrate count={dailyStreak} />
          ) : null}
        </div>
      ) : null}

      <dl className={`results-list results-list--${resultStats.length}`}>
        {resultStats.map(({ label, value, className }) => (
          <div className={className} key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {result.questionCount <= 10 ? (
        <ol className="answer-trail" aria-label="Question results">
          {result.answers.map((answer, index) => {
            const categoryLabel = getCategoryLabel(answer.category);
            const outcome = answer.correct ? 'correct' : 'incorrect';
            return (
              <li
                className={answer.correct ? 'answer-trail--correct' : ''}
                key={`${answer.category}-${index}`}
                title={`${categoryLabel}: ${outcome}`}
              >
                <span aria-hidden="true">
                  {answer.correct ? (
                    <CheckIcon weight="bold" />
                  ) : (
                    <XIcon weight="bold" />
                  )}
                </span>
                <span className="visually-hidden">
                  {categoryLabel}: {outcome}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className="score" aria-label={`Score ${formatScore(result.score)}`}>
        <span>Score</span>
        <strong>
          <AnimatedScore format={formatScore} value={result.score} />
        </strong>
      </div>

      {!resultSaved ? (
        <p className="personal-best personal-best--warning" role="alert">
          This result could not be saved. Keep this tab open or enable browser
          storage.
        </p>
      ) : highScoreLabel ? (
        <p className="personal-best">
          {isNewBest ? (
            <strong>New {highScoreLabel} best!</strong>
          ) : (
            `${highScoreLabel} best`
          )}{' '}
          {formatScore(bestResult.score)} points
        </p>
      ) : null}

      {mode.kind === 'daily' && resultSaved ? (
        <DailyReminderPrompt dailyDate={mode.date} />
      ) : null}

      <TrainerProgressSummary
        leagueVictory={leagueVictory}
        onOpenTrainerCard={onOpenTrainerCard}
        onOpenHallOfFame={onOpenHallOfFame}
        progressChanges={progressChanges}
      />

      {mode.kind !== 'league' ? (
        <div className="results__actions results__actions--paired">
          <GameButton
            onClick={mode.kind === 'training' ? onTrainAgain : onStartTraining}
          >
            {mode.kind === 'training' ? 'Train again' : 'Start training'}
          </GameButton>
          <ShareResultButton mode={mode} result={result} tone="quiet" />
        </div>
      ) : (
        <div className="results__actions">
          <GameButton onClick={onRetryLeague}>
            {leagueVictory ? 'League rematch' : 'Retry League'}
          </GameButton>
        </div>
      )}
    </section>
  );
};
