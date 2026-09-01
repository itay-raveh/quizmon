import { useCallback, useEffect, useRef, useState } from 'react';
import { getModeLabel } from '@/game/daily';
import {
  formatDuration,
  formatPokemonName,
  getAnswerPoints,
  getCategoryLabel,
  getSpeedBonusPoints,
} from '@/game/game';
import type {
  AnswerResult,
  GameMode,
  QuestionData,
  QuestionPrompt as QuestionPromptData,
} from '@/game/types';
import { GameButton } from './GameButton';
import { Progress } from './Progress';
import { SettingsButton } from './SettingsButton';
import { Sprite } from './Sprite';

interface QuestionProps {
  elapsedMilliseconds: number;
  elapsedSeconds: number;
  interactionPaused: boolean;
  mode: GameMode;
  nextQuestion?: QuestionData;
  number: number;
  onAnswer: (answer: AnswerResult) => void;
  onNewGame: () => void;
  onOpenSettings: () => void;
  question: QuestionData;
  speedrunMode: boolean;
  total: number;
}

const preloadQuestionImages = (question: QuestionData) => {
  const sources = [
    ...(question.media.kind === 'none' ? [] : [question.media.src]),
    ...Object.values(question.optionVisuals ?? {}).map(({ src }) => src),
  ];

  for (const src of sources) {
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = 'low';
    image.src = src;
  }
};

const QuestionPrompt = ({ prompt }: { prompt: QuestionPromptData }) => (
  <p className="question__prompt">
    {prompt.kind === 'text' ? (
      prompt.text
    ) : (
      <>
        {prompt.before}
        <span className="question__subject">
          <b>{formatPokemonName(prompt.name)}</b>{' '}
          <span className="question__subject-number">
            (No. {String(prompt.dexNumber).padStart(4, '0')})
          </span>
        </span>
        {prompt.after}
      </>
    )}
  </p>
);

export const Question = ({
  elapsedMilliseconds,
  elapsedSeconds,
  interactionPaused,
  mode,
  nextQuestion,
  number,
  onAnswer,
  onNewGame,
  onOpenSettings,
  question,
  speedrunMode,
  total,
}: QuestionProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [cluesShown, setCluesShown] = useState(1);
  const [awardedPoints, setAwardedPoints] = useState<number | null>(null);
  const answerTimeout = useRef<number | null>(null);
  const questionStartedAt = useRef(elapsedMilliseconds);

  useEffect(() => {
    if (nextQuestion) preloadQuestionImages(nextQuestion);
    return () => {
      if (answerTimeout.current !== null) {
        window.clearTimeout(answerTimeout.current);
      }
    };
  }, [nextQuestion]);

  const selectOption = useCallback(
    (option: string) => {
      if (interactionPaused || selectedOption) return;

      const correct = option === question.correctOption;
      const points = getAnswerPoints(question, correct, cluesShown);
      const responseMilliseconds = Math.max(
        0,
        elapsedMilliseconds - questionStartedAt.current,
      );
      const speedBonus = getSpeedBonusPoints(points, responseMilliseconds);
      const delay = speedrunMode ? 80 : correct ? 900 : 1700;
      setSelectedOption(option);
      setAwardedPoints(points + speedBonus);
      answerTimeout.current = window.setTimeout(
        () =>
          onAnswer({
            category: question.category,
            correct,
            points,
            responseMilliseconds,
            speedBonus,
          }),
        delay,
      );
    },
    [
      cluesShown,
      elapsedMilliseconds,
      interactionPaused,
      onAnswer,
      question,
      selectedOption,
      speedrunMode,
    ],
  );

  useEffect(() => {
    const answerWithKeyboard = (event: KeyboardEvent) => {
      if (
        interactionPaused ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat
      )
        return;
      const index = Number(event.key) - 1;
      const option = question.options[index];
      if (option) selectOption(option);
    };

    window.addEventListener('keydown', answerWithKeyboard);
    return () => window.removeEventListener('keydown', answerWithKeyboard);
  }, [interactionPaused, question.options, selectOption]);

  const optionClassName = (option: string) => {
    if (!selectedOption) return 'answer';
    if (option === question.correctOption) return 'answer answer--correct';
    if (option === selectedOption) return 'answer answer--wrong';
    return 'answer answer--muted';
  };

  const mediaVisible =
    question.media.kind !== 'sprite' ||
    question.media.revealAt === undefined ||
    cluesShown >= question.media.revealAt;
  const championPoints = getAnswerPoints(question, true, cluesShown);
  const className = [
    'question',
    question.media.kind === 'sprite' ? 'question--with-media' : '',
    question.media.kind === 'pixel-sprite' ? 'question--with-portrait' : '',
    number === 1 ? 'question--enter' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={className} aria-labelledby="question-title">
      <div className="question__topline">
        <Progress current={number} total={total} />
        <span
          className="timer"
          aria-label={`Elapsed time ${formatDuration(elapsedSeconds)}`}
        >
          {formatDuration(elapsedSeconds)}
        </span>
        <SettingsButton onClick={onOpenSettings} />
      </div>

      <h1 id="question-title">{getCategoryLabel(question.category)}</h1>
      <p className="game-mode">{getModeLabel(mode)}</p>
      <QuestionPrompt prompt={question.prompt} />

      {question.category === 'champion' && question.clues ? (
        <div className="clue-board">
          <ol aria-live="polite">
            {question.clues.slice(0, cluesShown).map((clue) => (
              <li key={clue}>{clue}</li>
            ))}
          </ol>
          {cluesShown < question.clues.length && !selectedOption ? (
            <GameButton
              className="clue-button"
              tone="quiet"
              onClick={() => setCluesShown((current) => current + 1)}
            >
              Reveal another clue · {championPoints - 25} points
            </GameButton>
          ) : null}
        </div>
      ) : null}

      {question.media.kind === 'sprite' && mediaVisible ? (
        <Sprite
          silhouette={question.media.silhouette && !selectedOption}
          src={question.media.src}
        />
      ) : null}

      {question.media.kind === 'pixel-sprite' ? (
        <div className="question__portrait" aria-hidden="true">
          <img
            className="pixel-sprite"
            src={question.media.src}
            alt=""
            decoding="async"
            fetchPriority="high"
            width="96"
            height="96"
          />
        </div>
      ) : null}

      <div
        className={`answers ${question.optionVisuals ? 'answers--pokemon' : ''}`.trim()}
      >
        {question.options.map((option, index) => {
          const visual = question.optionVisuals?.[option];
          return (
            <GameButton
              aria-keyshortcuts={String(index + 1)}
              className={`${optionClassName(option)} ${visual ? 'answer--pokemon' : ''}`.trim()}
              disabled={Boolean(selectedOption)}
              key={option}
              onClick={() => selectOption(option)}
            >
              <kbd aria-hidden="true">{index + 1}</kbd>
              {visual ? (
                <>
                  <span className="answer__sprite-field" aria-hidden="true">
                    <img
                      className="pixel-sprite answer__sprite"
                      src={visual.src}
                      alt=""
                      decoding="async"
                      width="96"
                      height="96"
                    />
                  </span>
                  <span className="answer__nameplate">
                    <small aria-hidden="true">
                      No. {String(visual.dexNumber).padStart(4, '0')}
                    </small>
                    <span>{formatPokemonName(option)}</span>
                  </span>
                </>
              ) : (
                <span>{formatPokemonName(option)}</span>
              )}
            </GameButton>
          );
        })}
      </div>

      <p className="answer-feedback" aria-live="polite">
        {selectedOption === question.correctOption
          ? `Correct! +${awardedPoints} points`
          : selectedOption
            ? `It was ${formatPokemonName(question.correctOption)}.`
            : '\u00a0'}
      </p>

      <GameButton className="new-game" tone="quiet" onClick={onNewGame}>
        Leave game
      </GameButton>
    </section>
  );
};
