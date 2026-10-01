import {
  baseQuestionRendering,
  resolveQuestionRendering,
} from '@/domain/quiz/variants';
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
    id: 'moveTypes:move:pound',
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
          rendering: resolveQuestionRendering('pokedexEntryMatch', 5),
          searchOptions: [{ name: 'grotle', sprite: '/grotle.png' }],
        }}
        answered
        cluesShown={0}
      />,
    ),
  ).toContain('/grotle.png');
});

test('item subject visibility controls the same artwork renderer', () => {
  const question: QuestionData = {
    answer: { interaction: 'single-choice', correctOptions: ['lava-cookie'] },
    category: 'identity',
    id: 'itemIdentification:item:lava-cookie',
    media: { kind: 'pixel-sprite', src: '/lava-cookie.png' },
    options: ['lava-cookie'],
    optionLabels: { 'lava-cookie': 'Lava Cookie' },
    prompt: { kind: 'text', text: 'Which item is shown?' },
    questionType: 'itemIdentification',
    repetition: {
      identity: 'lava-cookie',
      subjects: ['item/lava-cookie'],
      primary: [],
      distractors: [],
    },
    subject: { kind: 'item', name: 'lava-cookie', generation: 'III' },
  };
  const markup = (name: 'always' | 'never', sprite: boolean) =>
    renderToStaticMarkup(
      <QuestionArtwork
        question={{
          ...question,
          rendering: {
            ...baseQuestionRendering,
            subject: {
              ...baseQuestionRendering.subject,
              name,
              sprite: sprite ? { reveal: 'always', silhouette: false } : null,
            },
          },
        }}
        answered={false}
        cluesShown={0}
      />,
    );
  expect(markup('never', true)).toContain('/lava-cookie.png');
  expect(markup('never', true)).not.toContain('>Lava Cookie</strong>');
  expect(markup('always', false)).not.toContain('/lava-cookie.png');
  expect(markup('always', false)).toContain('>Lava Cookie</strong>');
});

test('unnamed item-use prompt stays readable before the answer', () => {
  const rendering = {
    ...baseQuestionRendering,
    subject: {
      ...baseQuestionRendering.subject,
      name: 'after-answer' as const,
    },
  };
  const question: QuestionData = {
    answer: { interaction: 'single-choice', correctOptions: ['Cures poison.'] },
    category: 'knowledge',
    id: 'itemUses:item:antidote',
    media: { kind: 'pixel-sprite', src: '/antidote.png' },
    options: ['Cures poison.'],
    prompt: {
      kind: 'item',
      before: 'What does ',
      after: ' do?',
      name: 'Antidote',
      sprite: '/antidote.png',
    },
    questionType: 'itemUses',
    rendering,
    repetition: {
      identity: 'antidote',
      subjects: ['item/antidote'],
      primary: [],
      distractors: [],
    },
    subject: { kind: 'item', name: 'antidote', generation: 'I' },
  };
  const markup = (answered: boolean) =>
    renderToStaticMarkup(
      <QuestionPresentation
        question={question}
        rendering={rendering}
        answered={answered}
        cluesShown={0}
        isLeague={false}
      />,
    );

  expect(markup(false)).toContain('class="visually-hidden">this item</span>');
  expect(markup(true)).not.toContain(
    'class="visually-hidden">this item</span>',
  );
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
    id: 'spriteForPokemon:bulbasaur',
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

  expect(markup(false)).toContain('aria-label="No. 0001"');
  expect(markup(true)).toContain('aria-label="Bulbasaur"');
  expect(
    markup(true, {
      ...question,
      rendering: {
        ...rendering,
        choices: { ...rendering.choices, name: 'never' },
      },
    }),
  ).toContain('aria-label="Bulbasaur"');

  const typeOnly = markup(false, {
    ...question,
    rendering: {
      ...rendering,
      choices: {
        sprite: null,
        name: 'never',
        number: 'never',
        types: 'always',
      },
    },
  });
  expect(typeOnly).not.toContain('/bulbasaur.png');
  expect(typeOnly).toContain('aria-label="Type: Grass."');
  expect(typeOnly).toContain('type-badge');
});
