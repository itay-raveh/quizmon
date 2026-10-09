import type { QuestionData } from '@/domain/quiz/types';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { QuestionAnswers } from './QuestionAnswers';

const types = ['bug', 'fire', 'grass', 'ice', 'water', 'steel'];

const question = (multiSelect: boolean): QuestionData => ({
  answer: {
    interaction: multiSelect ? 'multi-select' : 'single-choice',
    correctOptions: multiSelect ? ['fire', 'grass'] : ['fire'],
  },
  category: 'knowledge',
  id: 'type-picker:feedback',
  media: { kind: 'none' },
  options: types,
  prompt: { kind: 'text', text: 'Choose types' },
  questionType: 'typeMatchup',
  repetition: {
    identity: 'type-picker',
    subjects: [],
    primary: [],
    distractors: [],
  },
  subject: { kind: 'pokemon', name: 'pikachu', generation: 'I' },
});

const choices = (multiSelect: boolean, answered: boolean) => {
  const markup = renderToStaticMarkup(
    <QuestionAnswers
      question={question(multiSelect)}
      selectedOptions={['water', ...(multiSelect ? ['fire'] : [])]}
      answered={answered}
      onSelect={() => {}}
    />,
  );
  const buttons = markup.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
  const choice = (type: string) =>
    buttons.find((button) =>
      button.includes(`aria-label="${type[0]!.toUpperCase()}${type.slice(1)}`),
    ) ?? '';
  return { buttons, choice };
};

test('single-choice type feedback keeps every button in place', () => {
  const before = choices(false, false);
  const after = choices(false, true);

  expect(before.buttons).toHaveLength(types.length);
  expect(after.buttons).toHaveLength(types.length);
  expect(before.choice('water')).toContain('answer--selected');
  expect(after.choice('water')).toContain('answer--wrong');
  expect(after.choice('fire')).toContain('answer--correct');
  expect(after.choice('bug')).not.toMatch(/answer--(correct|wrong|missed)/);
  expect(after.buttons.every((button) => button.includes('disabled=""'))).toBe(
    true,
  );
});

test('multi-select type feedback distinguishes selected and missed answers', () => {
  const after = choices(true, true);

  expect(after.buttons).toHaveLength(types.length);
  expect(after.choice('fire')).toContain('answer--correct');
  expect(after.choice('grass')).toContain('answer--missed');
  expect(after.choice('water')).toContain('answer--wrong');
  expect(after.choice('bug')).not.toMatch(/answer--(correct|wrong|missed)/);
});
