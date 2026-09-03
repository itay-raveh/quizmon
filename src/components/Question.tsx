import { useEffect, useRef } from 'react';
import { getModeLabel } from '@/game/daily';
import {
  formatDuration,
  getCorrectOptions,
  getQuestionTitle,
} from '@/game/game';
import { formatPokemonName } from '@/game/format';
import type {
  AnswerResult,
  GameMode,
  QuestionData,
  QuestionPrompt as QuestionPromptData,
} from '@/game/types';
import { ChampionSearch } from './ChampionSearch';
import { GameButton } from './GameButton';
import { Progress } from './Progress';
import { QuestionAnswers } from './QuestionAnswers';
import { QuestionArtwork } from './QuestionArtwork';
import { QuestionClues } from './QuestionClues';
import { SettingsButton } from './SettingsButton';
import { useQuestionAnswer } from './useQuestionAnswer';

interface QuestionProps {
  elapsedMilliseconds: number;
  elapsedSeconds: number;
  interactionPaused: boolean;
  mode: GameMode;
  nextQuestion?: QuestionData;
  number: number;
  onAnswerRecorded?: (answer: AnswerResult) => void;
  onAnswer: (answer: AnswerResult) => void;
  onFeedbackStart: () => number;
  onNewGame: () => void;
  onOpenSettings: () => void;
  question: QuestionData;
  speedrunMode: boolean;
  total: number;
}

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
  onAnswerRecorded,
  onAnswer,
  onFeedbackStart,
  onNewGame,
  onOpenSettings,
  question,
  speedrunMode,
  total,
}: QuestionProps) => {
  const heading = useRef<HTMLHeadingElement>(null);
  const {
    answerCorrect,
    answered,
    cluesShown,
    correctOptions,
    finishAnswer,
    revealClue,
    selectedOptions,
    selectOption,
  } = useQuestionAnswer({
    elapsedMilliseconds,
    interactionPaused,
    mode,
    nextQuestion,
    onAnswer,
    onAnswerRecorded,
    onFeedbackStart,
    question,
    speedrunMode,
  });

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const isChampion = question.category === 'champion';
  const championChoicesVisible = isChampion && cluesShown > 0;
  const className = [
    'question',
    question.media.kind === 'sprite' || question.media.kind === 'pixel-peek'
      ? 'question--with-media'
      : '',
    question.media.kind === 'pixel-sprite' ? 'question--with-portrait' : '',
    isChampion && !championChoicesVisible ? 'question--champion-search' : '',
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
        <SettingsButton disabled={answered} onClick={onOpenSettings} />
      </div>

      <h1 id="question-title" ref={heading} tabIndex={-1}>
        {getQuestionTitle(question)}
      </h1>
      <p className="game-mode">{getModeLabel(mode)}</p>
      <QuestionPrompt prompt={question.prompt} />

      {isChampion && !championChoicesVisible && question.searchOptions ? (
        <ChampionSearch
          answered={answered}
          correctOption={correctOptions[0] ?? ''}
          disabled={interactionPaused}
          onAnswer={(option) => finishAnswer([option])}
          options={question.searchOptions}
          selectedOption={selectedOptions[0]}
        />
      ) : null}

      {isChampion ? (
        <QuestionClues
          answered={answered}
          cluesShown={cluesShown}
          onReveal={revealClue}
          question={question}
        />
      ) : null}

      <QuestionArtwork
        answered={answered}
        cluesShown={cluesShown}
        question={question}
      />

      {!isChampion || championChoicesVisible ? (
        <QuestionAnswers
          answered={answered}
          correctOptions={correctOptions}
          onSelect={selectOption}
          question={question}
          selectedOptions={selectedOptions}
        />
      ) : null}

      {question.answer.interaction !== 'single-choice' && !answered ? (
        <GameButton
          className="check-answer"
          clickSound="none"
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

      <GameButton
        className="new-game"
        disabled={answered}
        tone="quiet"
        onClick={onNewGame}
      >
        Leave game
      </GameButton>
    </section>
  );
};
