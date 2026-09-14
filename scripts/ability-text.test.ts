import { addAbilityDescriptions, parseAbilityText } from './ability-text';
import type { TopicCatalog } from '../src/domain/quiz/topic-catalog';

it('inherits generation-specific short text and explanations independently', async () => {
  const abilities: TopicCatalog['abilities'] = [
    {
      id: 1,
      name: 'test-ability',
      label: 'Test Ability',
      generations: ['VI'],
      effect: '',
    },
  ];
  await addAbilityDescriptions(
    abilities,
    `export const AbilitiesText = {
    testability: {
      shortDesc: '1.2× power.', desc: 'Modern explanation.',
      gen6: { shortDesc: '1.3× power.' },
      gen7: { desc: 'Older explanation.' }
    }
  };`,
  );
  expect(abilities[0]!.descriptions).toEqual([
    {
      generation: 'VI',
      text: '1.3× power.',
      explanation: 'Older explanation.',
    },
    {
      generation: 'VII',
      text: '1.2× power.',
      explanation: 'Older explanation.',
    },
    {
      generation: 'VIII',
      text: '1.2× power.',
      explanation: 'Modern explanation.',
    },
    {
      generation: 'IX',
      text: '1.2× power.',
      explanation: 'Modern explanation.',
    },
  ]);
});

it('excludes placeholders and reads remote text without evaluating code', async () => {
  expect(() =>
    parseAbilityText(
      `export const AbilitiesText = { test: { shortDesc: runCode() } };`,
    ),
  ).toThrow('Nonliteral');
  const abilities: TopicCatalog['abilities'] = [
    { id: 1, name: 'test', label: 'Test', generations: ['IX'], effect: '' },
  ];
  await addAbilityDescriptions(
    abilities,
    `export const AbilitiesText = { test: { shortDesc: 'No competitive use.' } };`,
  );
  expect(abilities[0]!.descriptions).toEqual([]);
});
