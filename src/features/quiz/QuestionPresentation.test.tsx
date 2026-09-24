import { defaultQuestionRendering } from '@/domain/quiz/question-variants';
import type { QuestionData } from '@/domain/quiz/types';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { QuestionArtwork } from './QuestionArtwork';
import { QuestionAnswers } from './QuestionAnswers';
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
      text: 'What is the default type of Pound?',
      description: 'The user strikes the target with its forelegs or tail.',
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

test('reveals a Field notes answer in its choice without a duplicate portrait', () => {
  const question: QuestionData = {
    answer: { interaction: 'single-choice', correctOptions: ['grotle'] },
    category: 'description',
    id: 'description:grotle',
    media: { kind: 'none' },
    optionVisuals: {
      grotle: { dexNumber: 388, src: '/grotle.png', types: ['grass'] },
    },
    options: ['grotle'],
    prompt: { kind: 'text', text: 'A Pokédex description' },
    questionType: 'field-notes',
    repetition: {
      identity: 'grotle',
      subjects: ['pokemon/grotle'],
      primary: ['grotle'],
      distractors: [],
    },
    subject: { kind: 'pokemon', name: 'grotle', generation: 'IV' },
  };

  expect(
    renderToStaticMarkup(
      <QuestionArtwork question={question} answered cluesShown={0} />,
    ),
  ).toBe('');
  expect(
    renderToStaticMarkup(
      <QuestionAnswers
        question={question}
        answered
        onSelect={() => {}}
        selectedOptions={['grotle']}
      />,
    ),
  ).toContain('/grotle.png');

  expect(
    renderToStaticMarkup(
      <QuestionArtwork
        question={{
          ...question,
          answer: { interaction: 'search', correctOptions: ['grotle'] },
        }}
        answered
        cluesShown={0}
      />,
    ),
  ).toContain('/grotle.png');
});
