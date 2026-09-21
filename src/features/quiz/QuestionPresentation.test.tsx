import { defaultQuestionRendering } from '@/domain/quiz/question-variants';
import type { QuestionData } from '@/domain/quiz/types';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { QuestionPresentation } from './QuestionPresentation';

test('separates a move description from its question', () => {
  const question: QuestionData = {
    answer: { interaction: 'single-choice', correctOptions: ['normal'] },
    category: 'move',
    id: 'move-types:move:pound',
    media: { kind: 'none' },
    options: ['normal', 'ghost', 'water', 'psychic'],
    prompt: {
      kind: 'text',
      text: 'What is the default type of Pound? The user strikes the target with its forelegs or tail.',
      supportingText: 'Pokémon Pearl',
    },
    questionType: 'move-types',
    repetition: {
      identity: 'pound',
      subjects: ['move/pound'],
      primary: [],
      distractors: [],
    },
    subject: { kind: 'move', name: 'pound', generation: 'IV' },
  };
  const markup = renderToStaticMarkup(
    <QuestionPresentation
      question={question}
      rendering={defaultQuestionRendering}
      answered={false}
      cluesShown={0}
      isLeague={false}
    />,
  );

  expect(markup).toContain(
    'Pound?<span class="question__move-description">The user strikes',
  );
  expect(markup).toContain('Pokémon Pearl');
});
