import { convertLegacyRound } from './cutover-data.ts';

const legacy = (mode: 'training' | 'daily') => ({
  id: crypto.randomUUID(),
  ownerId: 'trainer',
  fact: {
    id: '',
    mode,
    day: mode === 'daily' ? '2026-09-29' : null,
    completed_at: '2026-09-29T12:00:00.000Z',
    data: {
      config: {
        difficulty: 3,
        generations: ['I'],
        form_groups: ['standard'],
      },
      answers: Array.from({ length: mode === 'daily' ? 5 : 10 }, () => ({
        question_type: 'pokemonTypes',
        subject: { kind: 'pokemon', name: 'bulbasaur' },
        question: {
          interaction: 'single-choice',
          options: ['grass', 'fire', 'water', 'electric'],
          expected: ['grass'],
          selected: ['grass'],
        },
        clues_used: 0,
        response_ms: 1000,
      })),
    },
  },
});

it('converts only supported round facts', () => {
  const training = legacy('training');
  training.fact.id = training.id;
  const compact = convertLegacyRound(training);
  expect(compact?.mode).toBe('training');
  expect(compact?.answers[0]).toEqual({
    type: 'pokemonTypes',
    subject: 'bulbasaur',
    options: ['grass', 'fire', 'water', 'electric'],
    expected: ['grass'],
    selected: ['grass'],
    responseMs: 1000,
  });
  training.fact.data.answers[0]!.question_type = 'itemIdentification';
  training.fact.data.answers[0]!.subject.kind = 'move';
  expect(convertLegacyRound(training)).toBeNull();
});
