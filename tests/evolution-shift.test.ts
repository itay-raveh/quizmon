import { buildQuestionType } from '@/game/questions/registry';
import { catalog, createQuestionContext } from './fixtures/catalog';

it.each([
  'eevee',
  'kubfu',
  'dartrix',
  'mr-mime',
  'linoone',
  'farfetchd',
  'corsola',
  'qwilfish',
  'basculin-red-striped',
])('does not ask an ambiguous or non-default-form type gain for %s', (name) => {
  const context = createQuestionContext('evolution-validity');
  context.pool = context.pool.filter(
    (candidate) =>
      candidate.name === name ||
      catalog.pokemon[name]!.evolvesTo.includes(candidate.name),
  );
  expect(context.pool.some((candidate) => candidate.name === name)).toBe(true);
  expect(buildQuestionType(context, 'evolution-shift')).toBeUndefined();
});

it('keeps ordinary evolutions to species with regional forms on their default typing', () => {
  for (const name of ['pikachu', 'cubone', 'exeggcute', 'koffing']) {
    const context = createQuestionContext(name);
    context.pool = context.pool.filter(
      (candidate) =>
        candidate.name === name ||
        catalog.pokemon[name]!.evolvesTo.includes(candidate.name),
    );
    expect(buildQuestionType(context, 'evolution-shift')).toBeUndefined();
  }
});

it('keeps every shipped evolution link reciprocal and addressable', () => {
  for (const [name, pokemon] of Object.entries(catalog.pokemon)) {
    for (const next of pokemon.evolvesTo) {
      expect(catalog.pokemon[next], `${name} → ${next}`).toBeDefined();
      expect(catalog.pokemon[next]!.evolvesFrom).toBe(name);
    }
    if (pokemon.evolvesFrom)
      expect(catalog.pokemon[pokemon.evolvesFrom]!.evolvesTo).toContain(name);
  }
});

it('still asks an unambiguous type gain', () => {
  const context = createQuestionContext('ordinary-evolution');
  context.pool = context.pool.filter(({ name }) =>
    ['charmeleon', 'charizard'].includes(name),
  );
  const question = buildQuestionType(context, 'evolution-shift');
  expect(question).toBeDefined();
  expect(question?.answer.correctOptions).toEqual(['flying']);
});
