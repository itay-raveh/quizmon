import { observeAnswer } from '../../domain/quiz/answer-observation';
import { getQuestionRendering } from '@/domain/quiz/question-variants';
import { showsSearchResponse } from '@/domain/quiz/question-interaction';
import {
  getAnswerPoints,
  getSpeedBonusPoints,
  isQuestionAnswerCorrect,
} from '@/domain/quiz/scoring';
import { type AnswerResult, type QuestionData } from '@/domain/quiz/types';
import { answerFlowDelays, type AnswerFlow } from '@/domain/settings/types';
import { useGameSounds } from '@/lib/audio/sound-context';
import { orderRegionOptions } from './region-option-order';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { reportSaveError } from '../../lib/storage/player-storage';
export interface UseQuestionAnswerOptions {
  answerFlow: AnswerFlow;
  elapsedMilliseconds: number;
  questionStartedMilliseconds?: number;
  interactionPaused: boolean;
  nextQuestion?: QuestionData;
  onAnswer: (answer: AnswerResult) => void | Promise<void>;
  onAnswerRecorded?: (answer: AnswerResult) => void | Promise<void>;
  onAssistance?: (count: number) => void;
  onFeedbackStart: () => number;
  question: QuestionData;
}
const preloadQuestionImages = (question: QuestionData) => {
  const rendering = getQuestionRendering(question);
  const sources = [
    ...(question.media.kind === 'none' || rendering.subject.sprite === 'never'
      ? []
      : [question.media.src]),
    ...(question.visual?.kind === 'evolution-link' ||
    question.visual?.kind === 'evolution-endpoints'
      ? Object.entries(question.visual.stages).flatMap(([name, { src }]) => {
          const role =
            question.visual?.kind === 'evolution-link' &&
            name === question.subject.name
              ? 'subject'
              : 'related';
          return rendering[role].sprite === 'never' ? [] : [src];
        })
      : []),
    ...(question.visual?.kind === 'evolution-shift' &&
    rendering.related.sprite !== 'never'
      ? [question.visual.evolution.src]
      : []),
    ...(rendering.choices.sprite === 'never'
      ? []
      : Object.values(question.optionVisuals ?? {}).map(({ src }) => src)),
  ];
  for (const src of new Set(sources)) {
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = 'low';
    image.src = src;
  }
};
export const useQuestionAnswer = ({
  answerFlow,
  elapsedMilliseconds,
  questionStartedMilliseconds,
  interactionPaused,
  nextQuestion,
  onAnswer,
  onAnswerRecorded,
  onAssistance,
  onFeedbackStart,
  question,
}: UseQuestionAnswerOptions) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [cluesShown, setCluesShown] = useState(question.assistanceUsed ?? 0);
  const answered = answerResult !== null;
  const { playCorrect, playWrong } = useGameSounds();
  const answerStarted = useRef(false);
  const answerAdvanced = useRef(false);
  const answerWrite = useRef<void | Promise<void>>(undefined);
  const answerTimeout = useRef<number | null>(null);
  const questionStartedAt = useRef(
    questionStartedMilliseconds ?? elapsedMilliseconds,
  );
  useEffect(() => {
    preloadQuestionImages(question);
    if (nextQuestion) preloadQuestionImages(nextQuestion);
    return () => {
      if (answerTimeout.current !== null) {
        window.clearTimeout(answerTimeout.current);
      }
    };
  }, [nextQuestion, question]);
  const submitAnswer = useCallback(
    async (answer: AnswerResult) => {
      if (answerAdvanced.current) return;
      answerAdvanced.current = true;
      const saveAndAdvance = async () => {
        if (answerWrite.current) await answerWrite.current;
        await onAnswer(answer);
      };
      try {
        await saveAndAdvance();
      } catch (error) {
        reportSaveError(error, async () => {
          answerWrite.current = onAnswerRecorded?.(answer);
          await saveAndAdvance();
        });
      }
    },
    [onAnswer, onAnswerRecorded],
  );
  const advanceAnswer = useCallback(() => {
    if (answerResult) void submitAnswer(answerResult);
  }, [answerResult, submitAnswer]);
  const finishAnswer = useCallback(
    (options: string[]) => {
      if (interactionPaused || answered || answerStarted.current) return;
      answerStarted.current = true;

      const correct = isQuestionAnswerCorrect(question, options);
      const points = getAnswerPoints(
        question,
        correct,
        cluesShown + (question.initialClues ?? 0),
      );
      const responseMilliseconds = Math.max(
        0,
        Math.round(onFeedbackStart() - questionStartedAt.current),
      );
      const answer = {
        observation: observeAnswer(question, options),
        category: question.category,
        cluesUsed: cluesShown + (question.initialClues ?? 0),
        unassistedSearch:
          question.category === 'champion' &&
          showsSearchResponse(question, 0) &&
          !question.initialClues &&
          cluesShown === 0,
        correct,
        points,
        questionType: question.questionType,
        responseMilliseconds,
        speedBonus: getSpeedBonusPoints(points, responseMilliseconds),
        subject: {
          kind: question.subject.kind,
          generation: question.subject.generation,
          name: question.subject.name,
        },
      };
      const reveal = () => {
        setSelectedOptions(options);
        setAnswerResult(answer);
        if (correct) playCorrect();
        else playWrong();
        if (answerFlow !== 'manual')
          answerTimeout.current = window.setTimeout(() => {
            void submitAnswer(answer);
          }, answerFlowDelays[answerFlow]);
      };
      const saveAnswer = async () => {
        answerWrite.current = onAnswerRecorded?.(answer);
        if (answerWrite.current) await answerWrite.current;
        reveal();
      };
      answerWrite.current = onAnswerRecorded?.(answer);
      if (answerWrite.current)
        void answerWrite.current
          .then(reveal)
          .catch((error: unknown) => reportSaveError(error, saveAnswer));
      else reveal();
    },
    [
      answerFlow,
      answered,
      cluesShown,
      interactionPaused,
      submitAnswer,
      onAnswerRecorded,
      onFeedbackStart,
      playCorrect,
      playWrong,
      question,
    ],
  );
  const selectOption = useCallback(
    (option: string) => {
      if (interactionPaused || answered) return;
      if (question.answer.interaction !== 'multi-select') {
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
      showsSearchResponse(question, cluesShown)
    ) {
      return;
    }
    if (
      event.key === 'Enter' &&
      question.answer.interaction === 'multi-select' &&
      selectedOptions.length > 0 &&
      (!(event.target instanceof HTMLElement) ||
        !event.target.closest(
          'button, input, select, textarea, [contenteditable]',
        ))
    ) {
      event.preventDefault();
      finishAnswer(selectedOptions);
      return;
    }
    if (question.options.length > 9) return;
    const option = orderRegionOptions(question)[Number(event.key) - 1];
    if (option) selectOption(option);
  });
  useEffect(() => {
    window.addEventListener('keydown', answerWithKeyboard);
    return () => window.removeEventListener('keydown', answerWithKeyboard);
  }, []);
  return {
    answerCorrect: answerResult?.correct === true,
    answered,
    advanceAnswer,
    cluesShown,
    finishAnswer,
    revealClue: () => {
      const count = cluesShown + 1;
      onAssistance?.(count);
      setCluesShown(count);
    },
    selectedOptions,
    selectOption,
  };
};
