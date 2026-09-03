import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { useGameSounds } from '@/audio/sound';
import {
  getAnswerPoints,
  getCorrectOptions,
  getSpeedBonusPoints,
  isQuestionAnswerCorrect,
} from '@/game/game';
import type { AnswerResult, GameMode, QuestionData } from '@/game/types';

interface UseQuestionAnswerOptions {
  elapsedMilliseconds: number;
  interactionPaused: boolean;
  mode: GameMode;
  nextQuestion?: QuestionData;
  onAnswer: (answer: AnswerResult) => void;
  onAnswerRecorded?: (answer: AnswerResult) => void;
  onFeedbackStart: () => number;
  question: QuestionData;
  speedrunMode: boolean;
}

const QUICK_FEEDBACK_DELAY = 300;
const DAILY_FEEDBACK_DELAY = 850;
const TRAINING_FEEDBACK_DELAY = 1_200;

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

export const useQuestionAnswer = ({
  elapsedMilliseconds,
  interactionPaused,
  mode,
  nextQuestion,
  onAnswer,
  onAnswerRecorded,
  onFeedbackStart,
  question,
  speedrunMode,
}: UseQuestionAnswerOptions) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);
  const [cluesShown, setCluesShown] = useState(0);
  const { playCorrect, playWrong } = useGameSounds();
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
        onFeedbackStart() - questionStartedAt.current,
      );
      const answer = {
        category: question.category,
        correct,
        points,
        responseMilliseconds,
        speedBonus: getSpeedBonusPoints(points, responseMilliseconds),
      };
      const delay = speedrunMode
        ? QUICK_FEEDBACK_DELAY
        : mode.kind === 'daily'
          ? DAILY_FEEDBACK_DELAY
          : TRAINING_FEEDBACK_DELAY;

      setSelectedOptions(options);
      setAnswered(true);
      if (correct) playCorrect();
      else playWrong();
      onAnswerRecorded?.(answer);
      answerTimeout.current = window.setTimeout(() => onAnswer(answer), delay);
    },
    [
      answered,
      cluesShown,
      interactionPaused,
      mode.kind,
      onAnswer,
      onAnswerRecorded,
      onFeedbackStart,
      playCorrect,
      playWrong,
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

      setSelectedOptions((current) =>
        current.includes(option)
          ? current.filter((selected) => selected !== option)
          : [...current, option],
      );
    },
    [answered, finishAnswer, interactionPaused, question.answer.interaction],
  );

  const answerWithKeyboard = useEffectEvent((event: KeyboardEvent) => {
    if (
      interactionPaused ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.repeat ||
      event.target instanceof HTMLInputElement ||
      (question.category === 'champion' && cluesShown === 0)
    ) {
      return;
    }

    const option = question.options[Number(event.key) - 1];
    if (option) selectOption(option);
  });

  useEffect(() => {
    window.addEventListener('keydown', answerWithKeyboard);
    return () => window.removeEventListener('keydown', answerWithKeyboard);
  }, []);

  return {
    answerCorrect:
      answered && isQuestionAnswerCorrect(question, selectedOptions),
    answered,
    cluesShown,
    correctOptions: getCorrectOptions(question),
    finishAnswer,
    revealClue: () => setCluesShown((current) => current + 1),
    selectedOptions,
    selectOption,
  };
};
