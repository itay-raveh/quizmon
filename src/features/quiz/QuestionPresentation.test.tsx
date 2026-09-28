import { baseQuestionRendering } from '@/domain/quiz/question-variants';
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
    questionType: 'moveTypes',
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
      rendering={baseQuestionRendering}
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
    questionType: 'pokedexEntryMatch',
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

test('shows TM disc art and a visible type label for each choice', () => {
  const question: QuestionData = {
    answer: { interaction: 'single-choice', correctOptions: ['fire'] },
    category: 'move',
    id: 'item-identification:move:flamethrower',
    media: { kind: 'none' },
    options: ['fire', 'water', 'grass', 'electric'],
    optionImages: Object.fromEntries(
      ['fire', 'water', 'grass', 'electric'].map((type) => [
        type,
        `/sprites/items/tm-${type}.png`,
      ]),
    ),
    prompt: {
      kind: 'text',
      text: 'Which TM disc matches Flamethrower?',
    },
    questionType: 'itemIdentification',
    repetition: {
      identity: 'flamethrower',
      subjects: ['move/flamethrower'],
      primary: [],
      distractors: [],
    },
    subject: { kind: 'move', name: 'flamethrower', generation: 'II' },
  };
  const markup = renderToStaticMarkup(
    <QuestionAnswers
      question={question}
      answered={false}
      onSelect={() => {}}
      selectedOptions={[]}
    />,
  );
  expect(markup).toContain('/sprites/items/tm-fire.png');
  expect(markup).toContain('>Fire</span>');
});

test('choice name visibility follows the saved rendering policy', () => {
  const rendering = {
    ...baseQuestionRendering,
    choices: {
      ...baseQuestionRendering.choices,
      name: 'after-answer' as const,
    },
  };
  const question: QuestionData = {
    answer: { interaction: 'single-choice', correctOptions: ['bulbasaur'] },
    category: 'identity',
    id: 'sprite-for-pokemon:bulbasaur',
    media: { kind: 'none' },
    options: ['bulbasaur'],
    optionVisuals: {
      bulbasaur: { dexNumber: 1, src: '/bulbasaur.png', types: ['grass'] },
    },
    prompt: { kind: 'text', text: 'Find Bulbasaur.' },
    questionType: 'spriteForPokemon',
    repetition: {
      identity: 'bulbasaur',
      subjects: ['pokemon/bulbasaur'],
      primary: ['bulbasaur'],
      distractors: [],
    },
    subject: { kind: 'pokemon', name: 'bulbasaur', generation: 'I' },
    rendering,
  };
  const markup = (answered: boolean, current = question) =>
    renderToStaticMarkup(
      <QuestionAnswers
        question={current}
        answered={answered}
        onSelect={() => {}}
        selectedOptions={[]}
      />,
    );

  expect(markup(false)).toContain('aria-label="Sprite 1"');
  expect(markup(true)).toContain('aria-label="Bulbasaur"');
  expect(
    markup(true, {
      ...question,
      rendering: {
        ...rendering,
        choices: { ...rendering.choices, name: 'never' },
      },
    }),
  ).toContain('aria-label="Sprite 1"');
});
