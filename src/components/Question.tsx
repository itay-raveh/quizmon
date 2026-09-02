import { useCallback, useEffect, useRef, useState } from 'react';
import { getModeLabel } from '@/game/daily';
import {
  formatDuration,
  formatPokemonName,
  getAnswerPoints,
  getCorrectOptions,
  getQuestionTitle,
  isQuestionAnswerCorrect,
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

const formatCorrectAnswer = (question: QuestionData): string => {
  const names = getCorrectOptions(question).map(formatPokemonName);
  if (names.length < 2) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
};

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
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);
  const [cluesShown, setCluesShown] = useState(1);
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

  const finishAnswer = useCallback(
    (options: string[]) => {
      if (interactionPaused || answered) return;

      const correct = isQuestionAnswerCorrect(question, options);
      const points = getAnswerPoints(question, correct, cluesShown);
      const responseMilliseconds = Math.max(
        0,
        elapsedMilliseconds - questionStartedAt.current,
      );
      const speedBonus = getSpeedBonusPoints(points, responseMilliseconds);
      const delay = speedrunMode ? 80 : correct ? 900 : 1700;
      setSelectedOptions(options);
      setAnswered(true);
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
      answered,
      elapsedMilliseconds,
      interactionPaused,
      onAnswer,
      question,
      speedrunMode,
    ],
  );

  const selectOption = useCallback(
    (option: string) => {
      if (interactionPaused || answered) return;
      if (question.answer.interaction === 'single-choice') {
        finishAnswer([option]);
        return;
      }

      setSelectedOptions((current) => {
        if (current.includes(option)) {
          return current.filter((selected) => selected !== option);
        }
        return [...current, option];
      });
    },
    [answered, finishAnswer, interactionPaused, question.answer],
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

  const answerCorrect =
    answered && isQuestionAnswerCorrect(question, selectedOptions);
  const correctOptions = getCorrectOptions(question);
  const optionClassName = (option: string) => {
    const selected = selectedOptions.includes(option);
    if (!answered) return selected ? 'answer answer--selected' : 'answer';
    if (correctOptions.includes(option)) return 'answer answer--correct';
    if (selected) return 'answer answer--wrong';
    return 'answer answer--muted';
  };

  const mediaVisible =
    question.media.kind !== 'sprite' ||
    question.media.revealAt === undefined ||
    cluesShown >= question.media.revealAt;
  const className = [
    'question',
    question.media.kind === 'sprite' || question.media.kind === 'pixel-peek'
      ? 'question--with-media'
      : '',
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

      <h1 id="question-title">{getQuestionTitle(question)}</h1>
      <p className="game-mode">{getModeLabel(mode)}</p>
      <QuestionPrompt prompt={question.prompt} />

      {question.category === 'champion' && question.clues ? (
        <div className="clue-board">
          <ol aria-live="polite">
            {question.clues.slice(0, cluesShown).map((clue) => (
              <li key={clue}>{clue}</li>
            ))}
          </ol>
          {cluesShown < question.clues.length && !answered ? (
            <GameButton
              className="clue-button"
              tone="quiet"
              onClick={() => setCluesShown((current) => current + 1)}
            >
              Reveal another clue ·{' '}
              {getAnswerPoints(question, true, cluesShown + 1)} points
            </GameButton>
          ) : null}
        </div>
      ) : null}

      {question.media.kind === 'sprite' && mediaVisible ? (
        <Sprite
          silhouette={question.media.silhouette && !answered}
          src={question.media.src}
        />
      ) : null}

      {question.media.kind === 'pixel-peek' ? (
        <div
          className={`pixel-peek ${answered ? 'pixel-peek--revealed' : ''}`.trim()}
        >
          <img
            className="pixel-sprite pixel-peek__image"
            src={question.media.src}
            alt={
              answered
                ? formatPokemonName(question.pokemonName)
                : 'Cropped Pokémon sprite'
            }
            decoding="async"
            fetchPriority="high"
            style={{
              transformOrigin: `${question.media.focusX}% ${question.media.focusY}%`,
            }}
            width="96"
            height="96"
          />
        </div>
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
          const concealed = Boolean(question.concealOptionLabels && !answered);
          const selectionPosition = selectedOptions.indexOf(option) + 1;
          const selectionMark =
            question.answer.interaction === 'multi-select' &&
            selectionPosition > 0
              ? '✓'
              : index + 1;
          return (
            <GameButton
              aria-label={
                concealed
                  ? `Silhouette ${index + 1}`
                  : formatPokemonName(option)
              }
              aria-keyshortcuts={String(index + 1)}
              aria-pressed={
                question.answer.interaction === 'single-choice'
                  ? undefined
                  : selectedOptions.includes(option)
              }
              className={`${optionClassName(option)} ${visual ? 'answer--pokemon' : ''}`.trim()}
              disabled={answered}
              key={option}
              onClick={() => selectOption(option)}
            >
              <kbd aria-hidden="true">{selectionMark}</kbd>
              {visual ? (
                <>
                  <span className="answer__sprite-field" aria-hidden="true">
                    <img
                      className={`pixel-sprite answer__sprite ${visual.silhouette && !answered ? 'answer__sprite--silhouette' : ''}`.trim()}
                      src={visual.src}
                      alt=""
                      decoding="async"
                      width="96"
                      height="96"
                    />
                  </span>
                  <span className="answer__nameplate">
                    {concealed ? (
                      <span>Silhouette {index + 1}</span>
                    ) : (
                      <>
                        <small aria-hidden="true">
                          No. {String(visual.dexNumber).padStart(4, '0')}
                        </small>
                        <span>{formatPokemonName(option)}</span>
                      </>
                    )}
                  </span>
                </>
              ) : (
                <span>{formatPokemonName(option)}</span>
              )}
            </GameButton>
          );
        })}
      </div>

      {question.answer.interaction !== 'single-choice' && !answered ? (
        <GameButton
          className="check-answer"
          disabled={selectedOptions.length === 0}
          onClick={() => finishAnswer(selectedOptions)}
        >
          Check answers
        </GameButton>
      ) : null}

      <span className="visually-hidden" aria-live="polite">
        {answerCorrect
          ? 'Correct.'
          : answered
            ? `Incorrect. Correct answer: ${formatCorrectAnswer(question)}.`
            : ''}
      </span>

      <GameButton className="new-game" tone="quiet" onClick={onNewGame}>
        Leave game
      </GameButton>
    </section>
  );
};
