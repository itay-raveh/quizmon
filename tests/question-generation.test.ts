import { selectPokemonAnswerGroups } from '@/game/questions/answers';
import { makeQuestion } from '@/game/questions/assembly';
import { textPrompt } from '@/game/questions/prompts';
import { targetRepetition } from '@/game/questions/repetition';
import { createQuestionContext } from './fixtures/catalog';

it('keeps species distinct across correct and incorrect answer groups', () => {
  const context = createQuestionContext('answer-groups');
  const candidates = (names: string[]) =>
    context.pool.filter(({ name }) => names.includes(name));
  const matching = candidates(['charizard', 'blastoise']);
  const others = candidates(['charizard-mega-x', 'venusaur', 'pikachu']);
  const answers = selectPokemonAnswerGroups(context, {
    matching,
    others,
    correctCount: 2,
  });
  expect(answers?.options.toSorted()).toEqual([
    'blastoise',
    'charizard',
    'pikachu',
    'venusaur',
  ]);
  expect(answers?.correctOptions.toSorted()).toEqual([
    'blastoise',
    'charizard',
  ]);
  expect(
    selectPokemonAnswerGroups(context, {
      matching,
      others: candidates(['charizard-mega-x', 'venusaur']),
      correctCount: 2,
    }),
  ).toBeUndefined();
});

it('assembles presentation explicitly without inferring it from the question category', () => {
  const context = createQuestionContext('presentation');
  const target = context.pool.find(({ name }) => name === 'pikachu')!;
  const common = {
    repeat: targetRepetition({ pokemonOptions: true }),
    category: 'matchup' as const,
    target,
    correct: target.name,
    options: ['pikachu', 'eevee', 'mew', 'mewtwo'],
    prompt: textPrompt('Choose a Pokémon.'),
  };
  const names = makeQuestion(context, {
    ...common,
    presentation: { kind: 'pokemon-names', numbers: false },
  });
  expect(names.media).toEqual({ kind: 'none' });
  expect(names.optionVisuals).toBeUndefined();
  expect(names.optionDexNumbers).toBeUndefined();

  const sprites = makeQuestion(context, {
    ...common,
    presentation: {
      kind: 'pokemon-sprites',
      labels: 'concealed',
      source: (pokemon) => pokemon.shinySprite,
    },
    details: { kind: 'classification' },
  });
  expect(sprites.concealOptionLabels).toBe(true);
  expect(sprites.optionVisuals?.pikachu?.src).toBe(target.pokemon.shinySprite);
  expect(sprites.optionDexNumbers?.pikachu).toBe(25);
  expect(sprites.optionClassifications).toEqual({
    pikachu: 'Neither',
    eevee: 'Neither',
    mew: 'Mythical',
    mewtwo: 'Legendary',
  });
  expect(sprites.answer).toEqual(names.answer);
  expect(sprites.repetition).toEqual(names.repetition);
});
