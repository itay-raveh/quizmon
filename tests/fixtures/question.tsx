import { QuestionScreen } from '@/features/quiz/QuestionScreen';
import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type { QuestionData } from '../../src/domain/quiz/types';

export const question: QuestionData = {
  repetition: {
    identity: 'pikachu',
    subjects: ['pikachu'],
    primary: ['pikachu'],
    distractors: [],
  },
  answer: { correctOptions: ['pikachu'], interaction: 'single-choice' },
  category: 'stat',
  generation: 'I',
  id: 'stat:pikachu:0',
  media: { kind: 'none' },
  options: ['pikachu', 'eevee', 'ditto', 'mew'],
  pokemonName: 'pikachu',
  pokemonTypes: ['electric'],
  prompt: { kind: 'text', text: 'Which Pokémon has the highest Speed?' },
  questionType: 'stat-showdown',
};

type QuestionScreenProps = ComponentProps<typeof QuestionScreen>;

export const renderQuestion = (overrides: Partial<QuestionScreenProps> = {}) =>
  render(
    <QuestionScreen
      answerFlow="manual"
      elapsedMilliseconds={0}
      elapsedSeconds={0}
      interactionPaused={false}
      mode={{ kind: 'training' }}
      number={1}
      onAnswer={vi.fn()}
      onFeedbackStart={() => 0}
      onNewGame={vi.fn()}
      question={question}
      timerDisplay="seconds"
      total={10}
      {...overrides}
    />,
  );
