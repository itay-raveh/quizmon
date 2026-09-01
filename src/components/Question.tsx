import { useCallback, useEffect, useRef, useState } from 'react';
import { getModeLabel } from '@/game/daily';
import {
  formatDuration,
  formatPokemonName,
  getAnswerPoints,
  getCategoryLabel,
} from '@/game/game';
import type { AnswerResult, GameMode, QuestionData } from '@/game/types';
import { GameButton } from './GameButton';
import { Progress } from './Progress';
import { Sprite } from './Sprite';

interface QuestionProps {
  elapsedSeconds: number;
  mode: GameMode;
  nextQuestion?: QuestionData;
  number: number;
  onAnswer: (answer: AnswerResult) => void;
  onNewGame: () => void;
  question: QuestionData;
  speedrunMode: boolean;
  total: number;
}

const preloadMedia = (question: QuestionData) => {
  if (question.media.kind === 'sprite') {
    const image = new Image();
    image.src = question.media.src;
  } else if (question.media.kind === 'cry') {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = question.media.src;
  }
};

export const Question = ({
  elapsedSeconds,
  mode,
  nextQuestion,
  number,
  onAnswer,
  onNewGame,
  question,
  speedrunMode,
  total,
}: QuestionProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [cluesShown, setCluesShown] = useState(1);
  const [cryStatus, setCryStatus] = useState('');
  const answerTimeout = useRef<number | null>(null);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (nextQuestion) preloadMedia(nextQuestion);
    return () => {
      if (answerTimeout.current !== null) {
        window.clearTimeout(answerTimeout.current);
      }
    };
  }, [nextQuestion]);

  const selectOption = useCallback(
    (option: string) => {
      if (selectedOption) return;

      const correct = option === question.correctOption;
      const points = getAnswerPoints(question, correct, cluesShown);
      const delay = speedrunMode ? 80 : correct ? 900 : 1700;
      setSelectedOption(option);
      answerTimeout.current = window.setTimeout(
        () => onAnswer({ category: question.category, correct, points }),
        delay,
      );
    },
    [cluesShown, onAnswer, question, selectedOption, speedrunMode],
  );

  useEffect(() => {
    const answerWithKeyboard = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat)
        return;
      const index = Number(event.key) - 1;
      const option = question.options[index];
      if (option) selectOption(option);
    };

    window.addEventListener('keydown', answerWithKeyboard);
    return () => window.removeEventListener('keydown', answerWithKeyboard);
  }, [question.options, selectOption]);

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

  const playCry = async () => {
    try {
      audio.current?.pause();
      if (audio.current) audio.current.currentTime = 0;
      await audio.current?.play();
      setCryStatus('Cry played.');
    } catch {
      setCryStatus('The cry could not be played. Try again.');
    }
  };

  return (
    <section
      className={
        question.media.kind === 'sprite'
          ? 'question question--with-media'
          : 'question'
      }
      aria-labelledby="question-title"
    >
      <div className="question__topline">
        <Progress current={number} total={total} />
        <span
          className="timer"
          aria-label={`Elapsed time ${formatDuration(elapsedSeconds)}`}
        >
          {formatDuration(elapsedSeconds)}
        </span>
      </div>

      <h1 id="question-title">{getCategoryLabel(question.category)}</h1>
      <p className="game-mode">{getModeLabel(mode)}</p>
      <p className="question__prompt">{question.prompt}</p>

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
          silhouette={question.media.silhouette}
          src={question.media.src}
        />
      ) : null}

      {question.media.kind === 'cry' ? (
        <div className="cry-player">
          <audio ref={audio} preload="auto" src={question.media.src} />
          <GameButton tone="quiet" onClick={() => void playCry()}>
            Play cry
          </GameButton>
          <span className="visually-hidden" aria-live="polite">
            {cryStatus}
          </span>
        </div>
      ) : null}

      <div className="answers">
        {question.options.map((option, index) => (
          <GameButton
            aria-keyshortcuts={String(index + 1)}
            className={optionClassName(option)}
            disabled={Boolean(selectedOption)}
            key={option}
            onClick={() => selectOption(option)}
          >
            <kbd aria-hidden="true">{index + 1}</kbd>
            <span>{formatPokemonName(option)}</span>
          </GameButton>
        ))}
      </div>

      <p className="answer-feedback" aria-live="polite">
        {selectedOption === question.correctOption
          ? `Correct! +${getAnswerPoints(question, true, cluesShown)} points`
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
