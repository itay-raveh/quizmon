import { useEffect, useRef } from 'react';
import { getModeLabel } from '@/game/daily';
import {
  formatDuration,
  getCorrectOptions,
  getQuestionTitle,
} from '@/game/game';
import { getLeagueStageLabel } from '@/game/league';
import { formatPokemonName, formatPokemonTypes } from '@/game/format';
import type {
  AnswerResult,
  GameMode,
  QuestionData,
  QuestionPrompt as QuestionPromptData,
} from '@/game/types';
import { ChampionSearch } from './ChampionSearch';
import { GameButton } from './GameButton';
import { LeagueProgress } from './LeagueProgress';
import { Progress } from './Progress';
import { QuestionAnswers } from './QuestionAnswers';
import { QuestionArtwork } from './QuestionArtwork';
import { QuestionClues } from './QuestionClues';
import { SettingsButton } from './SettingsButton';
import { TypeBadges } from './TypeBadge';
import { useQuestionAnswer } from './useQuestionAnswer';

const subjectTypeRevealQuestionTypes = new Set<QuestionData['questionType']>([
  'counter-pick',
  'type-check',
  'type-matchup',
]);

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

const QuestionPrompt = ({
  className,
  id,
  prompt,
}: {
  className: string;
  id: string;
  prompt: QuestionPromptData;
}) => (
  <p className={className} id={id}>
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
  const advanceButton = useRef<HTMLButtonElement>(null);
  const {
    answerCorrect,
    answered,
    advanceAnswer,
    cluesShown,
    correctOptions,
    finishAnswer,
    revealClue,
    selectedOptions,
    selectOption,
  } = useQuestionAnswer({
    elapsedMilliseconds,
    interactionPaused,
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

  useEffect(() => {
    if (answered && !speedrunMode) advanceButton.current?.focus();
  }, [answered, speedrunMode]);

  const isChampion = question.category === 'champion';
  const isLeague = mode.kind === 'league';
  const modeLabel = isLeague
    ? getLeagueStageLabel(number)
    : mode.kind === 'daily'
      ? getModeLabel(mode)
      : null;
  const championChoicesVisible = isChampion && cluesShown > 0;
  const checkAnswerAction =
    question.answer.interaction !== 'single-choice' && !answered ? (
      <GameButton
        className="check-answer"
        clickSound="none"
        disabled={selectedOptions.length === 0}
        onClick={() => finishAnswer(selectedOptions)}
      >
        Check answers
      </GameButton>
    ) : null;
  const className = [
    'question',
    question.media.kind === 'sprite' || question.media.kind === 'pixel-peek'
      ? 'question--with-media'
      : '',
    question.media.kind === 'pixel-sprite' ? 'question--with-portrait' : '',
    question.visual ? 'question--with-visual' : '',
    isLeague ? 'question--league' : '',
    isChampion && !championChoicesVisible ? 'question--champion-search' : '',
    number === 1 ? 'question--enter' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={className}
      aria-describedby="question-prompt"
      aria-labelledby="question-title"
    >
      <div className="question__topline">
        <GameButton
          aria-label="Leave game"
          className="question__leave"
          disabled={answered}
          onClick={onNewGame}
          title="Leave game"
          tone="quiet"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </GameButton>
        <Progress current={number} total={total} />
        <span
          className="timer"
          aria-label={`Elapsed time ${formatDuration(elapsedSeconds)}`}
        >
          {formatDuration(elapsedSeconds)}
        </span>
        <SettingsButton disabled={answered} onClick={onOpenSettings} />
      </div>

      {isLeague ? <LeagueProgress currentQuestion={number} /> : null}

      <h1 id="question-title" ref={heading} tabIndex={-1}>
        {getQuestionTitle(question)}
      </h1>
      {modeLabel ? <p className="game-mode">{modeLabel}</p> : null}
      <QuestionPrompt
        className={question.visual ? 'visually-hidden' : 'question__prompt'}
        id="question-prompt"
        prompt={question.prompt}
      />

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

      {isChampion && !isLeague ? (
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

      {answered &&
      question.pokemonTypes.length > 0 &&
      subjectTypeRevealQuestionTypes.has(question.questionType) ? (
        <TypeBadges
          className={question.visual ? 'visually-hidden' : 'question__types'}
          label={`${formatPokemonName(question.pokemonName)} ${question.pokemonTypes.length === 1 ? 'type' : 'types'}: ${formatPokemonTypes(question.pokemonTypes)}.`}
          types={question.pokemonTypes}
        />
      ) : null}

      {!isChampion || championChoicesVisible ? (
        <QuestionAnswers
          answered={answered}
          correctOptions={correctOptions}
          onSelect={selectOption}
          question={question}
          selectedOptions={selectedOptions}
        />
      ) : null}

      <span className="visually-hidden" aria-live="polite">
        {answerCorrect
          ? 'Correct.'
          : answered
            ? `Incorrect. Correct answer: ${formatCorrectAnswer(question)}.`
            : ''}
      </span>

      {speedrunMode ? (
        checkAnswerAction
      ) : (
        <div className="question__action-slot">
          <span
            aria-hidden="true"
            className="game-button question__action-reserve"
          >
            Check answers
          </span>
          {checkAnswerAction}
          {answered ? (
            <GameButton
              className="new-game"
              onClick={advanceAnswer}
              ref={advanceButton}
            >
              {isLeague
                ? number === total || !answerCorrect
                  ? 'See result'
                  : 'Next question'
                : number === total
                  ? 'See results'
                  : 'Next question'}
            </GameButton>
          ) : null}
        </div>
      )}
    </section>
  );
};
