import { GameButton } from '@/components/GameButton';
import { LevelLabel } from '@/components/LevelLabel';
import { CaretDownIcon, CheckIcon, XIcon } from '@/components/icons';
import type { TrainerProgressChange } from '@/domain/player/trainer-progression';
import {
  formatDailyDate,
  formatDuration,
  formatDurationMilliseconds,
  formatScore,
} from '@/domain/quiz/format';
import { generations } from '@/domain/pokemon/types';
import { isLeagueVictory } from '@/domain/quiz/league';
import { getCategoryLabel } from '@/domain/quiz/questions/definitions';
import {
  calculateScore,
  getScoreBreakdown,
  getTrainingScoreBreakdown,
} from '@/domain/quiz/scoring';
import type { GameMode, GameResult } from '@/domain/quiz/types';
import type { GameSettings } from '@/domain/settings/types';
import { LeagueProgress } from '@/features/league/LeagueProgress';
import { DailyReminderPrompt } from '@/features/reminders/DailyReminderPrompt';
import { ShareResultButton } from '@/features/sharing/ShareResultButton';
import { TrainerProgressSummary } from '@/features/trainer/TrainerProgressSummary';
import { useGameSounds } from '@/lib/audio/sound-context';
import { useEffect, useRef } from 'react';
import { AnimatedScore } from './AnimatedScore';
import { CatchCombo } from '@/features/daily/CatchCombo';
import { markStayedAtLevel, suggestedLevel } from './level-advancement';
import { MultipliedScore } from './MultipliedScore';
import type { Level } from '@/domain/quiz/level';

const LevelAdvancementOffer = ({
  currentLevel,
  nextLevel,
  roundSeed,
  onTrainAgain,
  onTryLevel,
}: {
  currentLevel: Level;
  nextLevel: Level;
  roundSeed: string;
  onTrainAgain: () => void;
  onTryLevel: (level: Level) => void;
}) => {
  return (
    <aside
      className="results-offer level-advancement-offer"
      aria-label="Training suggestion"
    >
      <strong>
        Ready to try <LevelLabel level={nextLevel} />?
      </strong>
      <div className="level-advancement-offer__actions">
        <GameButton onClick={() => onTryLevel(nextLevel)}>
          Try <LevelLabel level={nextLevel} />
        </GameButton>
        <GameButton
          tone="quiet"
          onClick={() => {
            markStayedAtLevel(currentLevel, roundSeed);
            onTrainAgain();
          }}
        >
          Train <LevelLabel level={currentLevel} /> again
        </GameButton>
      </div>
    </aside>
  );
};

interface ResultStat {
  label: string;
  value: string;
  className?: string;
}

interface ResultsScreenProps {
  bestResult: GameResult;
  dailyStreak: number;
  isNewBest: boolean;
  mode: GameMode;
  settings: GameSettings;
  onNewGame: () => void;
  onTrainAgain: () => void;
  onTryLevel: (level: Level) => void;
  onStartTraining: () => void;
  onRetryLeague: () => void;
  trainingError?: string;
  result: GameResult;
  resultSaved: boolean;
  roundSeed: string;
  progressChanges: TrainerProgressChange[];
}

export const ResultsScreen = ({
  bestResult,
  dailyStreak,
  isNewBest,
  mode,
  settings,
  onNewGame,
  onTrainAgain,
  onTryLevel,
  onStartTraining,
  onRetryLeague,
  trainingError,
  result,
  resultSaved,
  roundSeed,
  progressChanges,
}: ResultsScreenProps) => {
  const { playPerfect, playResults, playScoreCount, stopCelebration } =
    useGameSounds();
  const heading = useRef<HTMLHeadingElement>(null);
  const isDaily = mode.kind === 'daily';
  const isLeague = mode.kind === 'league';
  const isTraining = mode.kind === 'training';
  const perfectTraining =
    isTraining && result.correctCount === result.questionCount;
  const nextLevel = isTraining ? suggestedLevel(result, settings.level) : null;
  const leagueVictory = isLeague && isLeagueVictory(result);
  const score = getScoreBreakdown(result.answers);
  const trainingScore =
    result.scoreMultipliers?.version === 2
      ? getTrainingScoreBreakdown(result.answers, result.scoreMultipliers)
      : null;
  const resultStats: ResultStat[] = [
    ...(!isLeague && result.questionCount > 10
      ? [
          {
            label: 'Correct',
            value: `${result.correctCount} / ${result.questionCount}`,
          },
        ]
      : []),
    {
      label: 'Time',
      className: 'results-list__time',
      value:
        settings.timerDisplay === 'milliseconds' &&
        result.elapsedMilliseconds !== undefined
          ? formatDurationMilliseconds(result.elapsedMilliseconds, 'minutes')
          : formatDuration(result.elapsedSeconds, 'minutes'),
    },
    ...(trainingScore
      ? [
          {
            label: 'Correct',
            value: `${result.correctCount} / ${result.questionCount}`,
          },
          { label: 'Answers', value: formatScore(trainingScore.answers) },
          { label: 'Speed', value: formatScore(trainingScore.speed) },
        ]
      : [
          {
            label: 'Knowledge',
            value: formatScore(score.knowledge),
          },
          { label: 'Speed', value: formatScore(score.speed) },
          { label: 'Mastery', value: formatScore(score.mastery) },
        ]),
  ];
  const highScoreLabel = isTraining ? 'Training' : isDaily ? 'Daily' : null;
  const resultTitle = isDaily
    ? 'Daily complete'
    : isLeague
      ? leagueVictory
        ? 'League Champion'
        : 'League challenge ended'
      : 'Training complete';

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    if (progressChanges.length === 0) {
      if (result.correctCount === result.questionCount) playPerfect();
      else if (result.score > 0) playResults();
    }

    const stopWhenHidden = () => {
      if (document.hidden) stopCelebration();
    };
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => {
      stopCelebration();
      document.removeEventListener('visibilitychange', stopWhenHidden);
    };
  }, [
    playPerfect,
    playResults,
    progressChanges.length,
    result.correctCount,
    result.questionCount,
    result.score,
    stopCelebration,
  ]);

  return (
    <section className="game-panel results" aria-labelledby="results-title">
      <div
        className={`results__header ${isDaily && dailyStreak > 0 ? 'results__header--with-combo' : ''}`.trim()}
      >
        <GameButton
          aria-label="Back to start"
          className="results__close"
          onClick={onNewGame}
          title="Back to start"
          tone="quiet"
        >
          <XIcon aria-hidden="true" weight="bold" />
        </GameButton>
        <div className="results__heading">
          <h1 id="results-title" ref={heading} tabIndex={-1}>
            {resultTitle}
          </h1>
          {isDaily ? (
            <p className="results__date">{formatDailyDate(mode.date)}</p>
          ) : null}
          {result.rules ? (
            <details className="results__settings">
              <summary>
                <span>
                  <LevelLabel level={result.rules.level} /> ·{' '}
                  {generations.every((generation) =>
                    result.rules?.generations.includes(generation),
                  )
                    ? 'All generations'
                    : result.rules.generations.length === 1
                      ? `Gen ${result.rules.generations[0]}`
                      : `${result.rules.generations.length} generations`}
                </span>
                <CaretDownIcon aria-hidden="true" weight="bold" />
              </summary>
              <dl>
                <div>
                  <dt>Generations</dt>
                  <dd>{result.rules.generations.join(', ')}</dd>
                </div>
                <div>
                  <dt>Forms</dt>
                  <dd>{result.rules.formGroups.join(', ')}</dd>
                </div>
              </dl>
            </details>
          ) : null}
        </div>
        {isDaily && dailyStreak > 0 ? (
          <CatchCombo
            className="results__combo"
            celebrate
            count={dailyStreak}
          />
        ) : null}
      </div>

      <div className="result-score">
        {perfectTraining ? (
          <div className="result-score__perfect">
            <strong>Perfect round</strong>
          </div>
        ) : null}
        {result.scoreMultipliers?.version === 2 ? (
          <div
            className="score"
            aria-label={`Score ${formatScore(result.score)}`}
          >
            <span>Score</span>
            <strong>
              <AnimatedScore
                playSound={playScoreCount}
                format={formatScore}
                value={result.score}
              />
            </strong>
          </div>
        ) : result.scoreMultipliers ? (
          <MultipliedScore
            baseScore={calculateScore(result.answers)}
            multipliers={result.scoreMultipliers}
            score={result.score}
          />
        ) : (
          <div
            className="score"
            aria-label={`Score ${formatScore(result.score)}`}
          >
            <span>Score</span>
            <strong>
              <AnimatedScore
                playSound={playScoreCount}
                format={formatScore}
                value={result.score}
              />
            </strong>
          </div>
        )}

        {!resultSaved ? (
          <p className="personal-best personal-best--warning" role="alert">
            This result could not be saved. Keep this tab open or enable browser
            storage.
          </p>
        ) : highScoreLabel ? (
          <p className="personal-best">
            {isNewBest ? (
              <strong>{`New ${highScoreLabel} best!`}</strong>
            ) : (
              `${highScoreLabel} best`
            )}{' '}
            {formatScore(bestResult.score)} points
          </p>
        ) : null}
      </div>
      <div className="result-details">
        <dl
          className={`results-list ${settings.timerDisplay === 'milliseconds' ? 'results-list--precise' : ''}`.trim()}
        >
          {resultStats.map(({ label, value, className }) => (
            <div className={className} key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {isLeague ? (
          <LeagueProgress
            currentQuestion={result.answers.length}
            completed={leagueVictory}
          />
        ) : result.questionCount <= 10 ? (
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
      </div>
      {nextLevel && result.rules ? (
        <LevelAdvancementOffer
          currentLevel={result.rules.level}
          nextLevel={nextLevel}
          roundSeed={roundSeed}
          onTrainAgain={onTrainAgain}
          onTryLevel={onTryLevel}
        />
      ) : null}
      {trainingError ? <p role="alert">{trainingError}</p> : null}
      {!isLeague ? (
        <div
          className={`results__actions ${nextLevel ? '' : 'results__actions--paired'}`.trim()}
        >
          {!nextLevel ? (
            <GameButton onClick={isTraining ? onTrainAgain : onStartTraining}>
              {isTraining ? 'Train again' : 'Start training'}
            </GameButton>
          ) : null}
          <ShareResultButton
            aria-label="Share result"
            mode={mode}
            result={result}
            tone="quiet"
          >
            Share
          </ShareResultButton>
        </div>
      ) : (
        <div className="results__actions">
          <GameButton onClick={onRetryLeague}>
            {leagueVictory ? 'League rematch' : 'Retry League'}
          </GameButton>
        </div>
      )}
      {isDaily && resultSaved ? (
        <DailyReminderPrompt dailyDate={mode.date} />
      ) : null}

      <TrainerProgressSummary
        leagueVictory={leagueVictory}
        progressChanges={progressChanges}
      />
    </section>
  );
};
