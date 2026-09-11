import { createQuestionContext } from '../../../tests/fixtures/catalog';
import { pokemonOptions, selectPokemonAnswerGroups } from './questions/answers';
import { makeQuestion } from './questions/assembly';
import { textPrompt } from './questions/prompts';
import { buildQuestionType } from './questions/registry';
import { targetRepetition } from './questions/repetition';

it('requires descriptions for every Field notes option', () => {
  const context = createQuestionContext('field-notes-descriptions');
  const names = ['carnivine', 'bulbasaur', 'chikorita', 'turtwig'];
  context.pool = context.pool.filter(({ name }) =>
    [...names, 'flapple-gmax', 'appletun-gmax', 'venusaur-gmax'].includes(name),
  );
  for (let index = 0; index < 20; index++) {
    const question = buildQuestionType(context, 'field-notes');
    expect(question?.options.toSorted()).toEqual(names.toSorted());
  }
  context.pool = context.pool.filter(({ name }) => name !== 'turtwig');
  expect(buildQuestionType(context, 'field-notes')).toBeUndefined();
});

it.each(['flapple-gmax', 'appletun-gmax', 'carnivine'])(
  'keeps identical Gigantamax appearances apart with %s as the answer',
  (name) => {
    const context = createQuestionContext(`identical-${name}`);
    context.pool = context.pool.filter(({ name }) =>
      [
        'flapple-gmax',
        'appletun-gmax',
        'carnivine',
        'bulbasaur',
        'turtwig',
      ].includes(name),
    );
    const target = context.pool.find((candidate) => candidate.name === name)!;
    for (let index = 0; index < 20; index++) {
      const options = pokemonOptions(context, { correct: target });
      expect(options).toHaveLength(4);
      expect(options).toContain(name);
      expect(
        options.filter((option) =>
          ['flapple-gmax', 'appletun-gmax'].includes(option),
        ),
      ).toHaveLength(1);
    }
  },
);

it('keeps identical appearances apart across multi-select answer groups', () => {
  const context = createQuestionContext('identical-groups');
  const candidates = (names: string[]) =>
    context.pool.filter(({ name }) => names.includes(name));
  const answers = selectPokemonAnswerGroups(context, {
    matching: candidates(['flapple-gmax', 'bulbasaur']),
    others: candidates(['appletun-gmax', 'carnivine', 'turtwig']),
    correctCount: 2,
  });
  expect(answers?.options.toSorted()).toEqual([
    'bulbasaur',
    'carnivine',
    'flapple-gmax',
    'turtwig',
  ]);
  expect(
    selectPokemonAnswerGroups(context, {
      matching: candidates(['flapple-gmax', 'appletun-gmax']),
      others: candidates(['carnivine', 'turtwig']),
      correctCount: 2,
    }),
  ).toBeUndefined();
});

it('excludes a shared sprite URL even for unrelated species', () => {
  const context = createQuestionContext('shared-sprite');
  const names = ['bulbasaur', 'chikorita', 'turtwig', 'carnivine', 'pikachu'];
  const pokemon = { ...context.catalog.pokemon };
  pokemon.chikorita = {
    ...pokemon.chikorita!,
    sprite: pokemon.bulbasaur!.sprite,
  };
  context.catalog = { ...context.catalog, pokemon };
  context.pool = names.map((name) => ({ name, pokemon: pokemon[name]! }));
  const options = pokemonOptions(context, { correct: context.pool[0]! });
  expect(options).toHaveLength(4);
  expect(options).not.toContain('chikorita');
});

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
