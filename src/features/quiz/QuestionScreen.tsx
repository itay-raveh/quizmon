import { supplementalItemSprites } from './item-sprites';
import { presentEvolutionQuestion } from '@/domain/quiz/questions/evolution-presentation';
import { presentEffectQuestion } from '@/domain/quiz/questions/effect-presentation';
import { GameButton } from '@/components/GameButton';
import { XIcon } from '@/components/icons';
import { PixelSprite } from '@/components/PixelSprite';
import { PokemonIdentity } from '@/components/PokemonIdentity';
import { TypeBadges } from '@/components/TypeBadge';
import {
  formatDuration,
  formatDurationMilliseconds,
  formatPokemonName,
  formatPokemonTypes,
  getModeLabel,
} from '@/domain/pokemon/format';
import type { PokemonCatalog, PokemonKnowledge } from '@/domain/pokemon/types';
import { getLeagueStageLabel } from '@/domain/quiz/league';
import { getQuestionTitle } from '@/domain/quiz/question-labels';
import { getAnswerPoints } from '@/domain/quiz/scoring';
import type {
  GameMode,
  QuestionData,
  QuestionPrompt as QuestionPromptData,
} from '@/domain/quiz/types';
import type { TimerDisplay } from '@/domain/settings/types';
import { TrainerTitleMark } from '@/features/trainer/TrainerTitleMark';
import { LeagueProgress } from '@/features/league/LeagueProgress';
import { useEffect, useMemo, useRef } from 'react';
import { ChampionSearch } from './ChampionSearch';
import { QuestionAnswers } from './QuestionAnswers';
import { QuestionArtwork } from './QuestionArtwork';
import { QuestionClues } from './QuestionClues';
import { QuestionInstruction } from './QuestionInstruction';
import { RoundProgress } from './RoundProgress';
import {
  useQuestionAnswer,
  type UseQuestionAnswerOptions,
} from './useQuestionAnswer';
const subjectTypeRevealQuestionTypes = new Set<QuestionData['questionType']>([
  'counter-pick',
  'type-check',
  'type-twins',
  'type-matchup',
]);
interface QuestionScreenProps extends UseQuestionAnswerOptions {
  answerPokemon?: PokemonKnowledge;
  typeRelations?: PokemonCatalog['typeRelations'];
  elapsedSeconds: number;
  mode: GameMode;
  number: number;
  onNewGame: () => void;
  timerDisplay: TimerDisplay;
  total: number;
}
const QuestionPrompt = ({
  className,
  prompt,
  itemSprite,
}: {
  className: string;
  prompt: QuestionPromptData;
  itemSprite?: string;
}) => (
  <p className={className} id="question-prompt">
    {prompt.kind === 'text' ? (
      <>
        {prompt.text}
        {prompt.supportingText || itemSprite ? (
          <span className="question__supporting-text">
            {itemSprite ? (
              <PixelSprite src={itemSprite} className="question__inline-item" />
            ) : null}
            {prompt.supportingText}
          </span>
        ) : null}
      </>
    ) : (
      <>
        {prompt.before}
        <PokemonIdentity
          className="question__subject"
          inline
          name={prompt.name}
          dexNumber={prompt.dexNumber}
          numberClassName="question__subject-number"
        />
        {prompt.after}
        {prompt.supportingText ? (
          <span className="question__supporting-text">
            {prompt.supportingText}
          </span>
        ) : null}
      </>
    )}
  </p>
);
const formatCorrectAnswer = (question: QuestionData): string => {
  const names = question.answer.correctOptions.map(
    (option) => question.optionLabels?.[option] ?? formatPokemonName(option),
  );
  if (names.length < 2) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
};
export const QuestionScreen = ({
  answerPokemon,
  answerFlow,
  typeRelations,
  elapsedMilliseconds,
  questionStartedMilliseconds,
  elapsedSeconds,
  interactionPaused,
  mode,
  nextQuestion,
  number,
  onAssistance,
  onAnswerRecorded,
  onAnswer,
  onFeedbackStart,
  onNewGame,
  question: storedQuestion,
  timerDisplay,
  total,
}: QuestionScreenProps) => {
  const question = useMemo(
    () => presentEvolutionQuestion(presentEffectQuestion(storedQuestion)),
    [storedQuestion],
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const advanceButton = useRef<HTMLButtonElement>(null);
  const {
    answerCorrect,
    answered,
    advanceAnswer,
    cluesShown,
    finishAnswer,
    revealClue,
    selectedOptions,
    selectOption,
  } = useQuestionAnswer({
    answerFlow,
    elapsedMilliseconds,
    questionStartedMilliseconds,
    interactionPaused,
    nextQuestion,
    onAnswer,
    onAssistance,
    onAnswerRecorded,
    onFeedbackStart,
    question,
  });
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (answered && answerFlow !== 'instant') advanceButton.current?.focus();
  }, [answerFlow, answered]);
  const isChampion = question.category === 'champion';
  const inlineItem =
    question.subject.kind !== 'pokemon' &&
    question.questionType !== 'item-identification' &&
    question.media.kind === 'pixel-sprite'
      ? question.media.src
      : question.subject.kind === 'item' &&
          question.questionType !== 'item-identification'
        ? supplementalItemSprites[question.subject.name]
        : undefined;
  const visualInstruction =
    !(
      question.prompt.kind === 'pokemon' &&
      question.media.kind === 'none' &&
      !(
        question.visual &&
        ['evolution-shift', 'evolution-endpoints', 'evolution-link'].includes(
          question.visual.kind,
        )
      )
    ) &&
    (Boolean(question.visual) ||
      ['ev-yields', 'hidden-abilities', 'egg-group-connections'].includes(
        question.questionType,
      ) ||
      (question.questionType === 'nature-effects' &&
        Boolean(
          question.optionReveals?.[question.answer.correctOptions[0]!],
        )) ||
      question.questionType === 'ability-check' ||
      question.questionType === 'move-check');
  const isLeague = mode.kind === 'league';
  const modeLabel = isLeague
    ? getLeagueStageLabel(number)
    : mode.kind === 'daily'
      ? getModeLabel(mode)
      : null;
  const revealArtworkInPlace =
    question.media.kind === 'sprite' && question.media.silhouette;
  const usesSearch =
    question.answer.interaction === 'search' ||
    (isChampion && !question.rulesVersion);
  const championChoicesVisible = isChampion && (!usesSearch || cluesShown > 0);
  const timerHidden = timerDisplay === 'hidden';
  const timerText =
    timerDisplay === 'milliseconds'
      ? formatDurationMilliseconds(elapsedMilliseconds)
      : formatDuration(elapsedSeconds);
  const checkAnswerAction =
    question.answer.interaction === 'multi-select' && !answered ? (
      <GameButton
        className="check-answer"
        disabled={selectedOptions.length === 0}
        onClick={() => finishAnswer(selectedOptions)}
        sound="none"
      >
        Check answers
      </GameButton>
    ) : null;
  const className = [
    'question',
    isChampion ? 'question--champion' : '',
    isChampion && !championChoicesVisible ? 'question--champion-search' : '',
    isLeague ? 'question--league' : '',
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
          onClick={onNewGame}
          title="Leave game"
          tone="quiet"
        >
          <XIcon aria-hidden="true" weight="bold" />
        </GameButton>
        <RoundProgress current={number} total={total} />
        <span
          className={`timer ${timerHidden ? 'timer--hidden' : ''}`.trim()}
          aria-hidden={timerHidden}
          aria-label={timerHidden ? undefined : `Elapsed time ${timerText}`}
        >
          {timerText}
        </span>
      </div>

      {isLeague ? <LeagueProgress currentQuestion={number} /> : null}

      <h1
        className="question__title"
        id="question-title"
        ref={heading}
        tabIndex={-1}
      >
        {question.category !== 'champion' &&
        question.category !== 'knowledge' ? (
          <TrainerTitleMark plain tier={0} specialty={question.category} />
        ) : null}
        <span>{getQuestionTitle(question)}</span>
      </h1>
      {modeLabel ? <p className="game-mode">{modeLabel}</p> : null}
      {visualInstruction ? (
        <QuestionPrompt className="visually-hidden" prompt={question.prompt} />
      ) : null}
      <div className="question__context">
        <div
          className="question__instruction"
          aria-hidden={visualInstruction || undefined}
        >
          {visualInstruction ? (
            <QuestionInstruction question={question} />
          ) : (
            <QuestionPrompt
              className="question__prompt"
              prompt={question.prompt}
              itemSprite={inlineItem}
            />
          )}
        </div>
        {question.suppliedClues?.length ? (
          <div className="clue-board">
            <ol>
              {question.suppliedClues.map((clue) => (
                <li key={clue}>{clue}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {!inlineItem && (!isChampion || cluesShown > 1 || answered) ? (
          <div className="question__stimulus">
            {isChampion && !isLeague && cluesShown > 1 ? (
              <QuestionClues cluesShown={cluesShown} question={question} />
            ) : null}
            {answered &&
            usesSearch &&
            !question.visual &&
            !revealArtworkInPlace ? null : (
              <QuestionArtwork
                answered={answered}
                cluesShown={cluesShown}
                question={question}
              />
            )}
          </div>
        ) : null}
      </div>

      {(answered || question.showTypes) &&
      !(
        (question.visual?.kind === 'type-matchup' ||
          question.visual?.kind === 'counter-pick') &&
        question.media.kind === 'pixel-sprite'
      ) &&
      (question.subject.types ?? []).length > 0 &&
      subjectTypeRevealQuestionTypes.has(question.questionType) ? (
        <TypeBadges
          className={
            question.visual && visualInstruction
              ? 'visually-hidden'
              : 'question__types'
          }
          label={`${formatPokemonName(question.subject.name)} ${(question.subject.types ?? []).length === 1 ? 'type' : 'types'}: ${formatPokemonTypes(question.subject.types ?? [])}.`}
          types={question.subject.types ?? []}
        />
      ) : null}

      <div className="question__response">
        {usesSearch &&
        (!isChampion || !championChoicesVisible) &&
        question.searchOptions ? (
          <ChampionSearch
            hideNumbers={isChampion}
            answered={answered}
            correctOption={question.answer.correctOptions[0] ?? ''}
            disabled={interactionPaused}
            onAnswer={(option) => finishAnswer([option])}
            options={question.searchOptions}
            selectedOption={selectedOptions[0]}
          />
        ) : (
          <QuestionAnswers
            typeRelations={typeRelations}
            answered={answered}
            onSelect={selectOption}
            question={question}
            selectedOptions={selectedOptions}
          />
        )}
      </div>

      {answered && usesSearch ? (
        <div className="question__answer-reveal">
          <strong>Correct answer</strong>
          {answerPokemon?.sprite && !revealArtworkInPlace ? (
            <PixelSprite src={answerPokemon.sprite} />
          ) : null}
          <PokemonIdentity
            name={question.subject.name}
            dexNumber={answerPokemon?.speciesId}
          >
            <TypeBadges
              types={question.subject.types ?? []}
              label={formatPokemonTypes(question.subject.types ?? [])}
            />
          </PokemonIdentity>
        </div>
      ) : null}

      <span className="visually-hidden" aria-live="polite">
        {answerCorrect
          ? 'Correct.'
          : answered
            ? `Incorrect. Correct answer: ${formatCorrectAnswer(question)}.`
            : ''}
      </span>

      <div className="question__action-slot">
        <span
          aria-hidden="true"
          className="game-button question__action-reserve"
        >
          {isChampion && !isLeague && championChoicesVisible
            ? `Reveal another clue · ${getAnswerPoints(question, true, 3)} points`
            : 'Check answers'}
        </span>
        {checkAnswerAction}
        {isChampion &&
        !isLeague &&
        question.assistanceAllowed !== false &&
        !answered &&
        question.clues &&
        cluesShown <= question.clues.length ? (
          <GameButton className="clue-button" tone="quiet" onClick={revealClue}>
            {cluesShown === 0 ? 'Show 4 choices' : 'Reveal another clue'} ·{' '}
            {getAnswerPoints(
              question,
              true,
              cluesShown + 1 + (question.initialClues ?? 0),
            )}{' '}
            points
          </GameButton>
        ) : null}
        {answered && answerFlow !== 'instant' ? (
          <GameButton
            className="new-game"
            onClick={advanceAnswer}
            ref={advanceButton}
          >
            {number === total || (isLeague && !answerCorrect)
              ? isLeague
                ? 'See result'
                : 'See results'
              : 'Next question'}
          </GameButton>
        ) : null}
      </div>
    </section>
  );
};
