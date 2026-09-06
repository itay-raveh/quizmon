import catalogData from '@/game/data/pokemon.json';
import { buildQuestionType } from '@/game/questions/registry';
import { createSeededRandom } from '@/game/random';
import {
  generations,
  type Generation,
  type PokemonCatalog,
} from '@/game/types';

const catalog = catalogData as PokemonCatalog;
const context = (
  seed: string,
  selected: readonly Generation[] = generations,
) => ({
  catalog,
  pool: Object.entries(catalog.pokemon)
    .filter(([, pokemon]) => selected.includes(pokemon.generation))
    .map(([name, pokemon]) => ({ name, pokemon })),
  random: createSeededRandom(seed),
  used: new Set<string>(),
});

describe('Type twins', () => {
  it.each(generations)(
    'always uses a dual-type target and exactly one exact match in Generation %s',
    (generation) => {
      for (let seed = 0; seed < 10; seed += 1) {
        const question = buildQuestionType(
          context(`twins-${seed}`, [generation]),
          'type-twins',
        );
        expect(question).toBeDefined();
        if (!question) throw new Error('Missing Type twins question');
        expect(question.pokemonTypes).toHaveLength(2);
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options).size).toBe(4);
        expect(question.options).not.toContain(question.pokemonName);
        const matches = question.options.filter(
          (name) =>
            catalog.pokemon[name]!.types.toSorted().join() ===
            question.pokemonTypes.toSorted().join(),
        );
        expect(matches).toEqual(question.answer.correctOptions);
        expect(matches).toHaveLength(1);
        for (const option of question.options)
          expect(catalog.pokemon[option]!.generation).toBe(generation);
      }
    },
  );

  it('matches reversed type order and rejects options that share only one type', () => {
    const current = context('reversed');
    const base = catalog.pokemon.bulbasaur!;
    current.catalog = {
      ...catalog,
      pokemon: {
        target: { ...base, types: ['fire', 'flying'] },
        twin: { ...base, types: ['flying', 'fire'] },
        fire: { ...base, types: ['fire'] },
        bird: { ...base, types: ['normal', 'flying'] },
        dragon: { ...base, types: ['dragon', 'flying'] },
      },
    };
    current.pool = Object.entries(current.catalog.pokemon).map(
      ([name, pokemon]) => ({ name, pokemon }),
    );
    const question = buildQuestionType(current, 'type-twins');
    expect(question?.options).toHaveLength(4);
    expect(
      new Set([question?.pokemonName, ...question!.answer.correctOptions]),
    ).toEqual(new Set(['target', 'twin']));
    expect(question?.answer.correctOptions).toHaveLength(1);
  });

  it('does not substitute a single-type target when no dual-type pair exists', () => {
    const current = context('single-types');
    current.pool = current.pool.filter(
      ({ pokemon }) => pokemon.types.length === 1,
    );
    expect(buildQuestionType(current, 'type-twins')).toBeUndefined();
    current.pool.push(
      context('target').pool.find(({ name }) => name === 'charizard')!,
    );
    expect(buildQuestionType(current, 'type-twins')).toBeUndefined();
  });

  it('skips type pairs that only exist within one evolution family', () => {
    const current = context('ludicolo');
    current.pool = current.pool.filter(({ name }) =>
      ['lotad', 'lombre', 'ludicolo', 'bellsprout', 'abra', 'paras'].includes(
        name,
      ),
    );
    expect(buildQuestionType(current, 'type-twins')).toBeUndefined();
  });

  it.each([
    {
      target: 'bulbasaur',
      relatives: ['ivysaur', 'venusaur'],
      alternatives: ['bellsprout', 'abra', 'ponyta', 'geodude'],
    },
    {
      target: 'charizard',
      relatives: ['charmander', 'charmeleon'],
      alternatives: ['moltres', 'abra', 'ponyta', 'geodude'],
    },
    {
      target: 'mothim',
      relatives: ['wormadam'],
      alternatives: ['butterfree', 'abra', 'ponyta', 'geodude'],
    },
  ])(
    'excludes the entire family of $target from every answer',
    ({ target, relatives, alternatives }) => {
      for (let seed = 0; seed < 10; seed += 1) {
        const current = context(`family-${seed}`);
        current.pool = current.pool.filter(({ name }) =>
          [target, ...relatives, ...alternatives].includes(name),
        );
        current.used = new Set(
          current.pool
            .map(({ name }) => name)
            .filter((name) => name !== target),
        );
        const question = buildQuestionType(current, 'type-twins');
        expect(question?.pokemonName).toBe(target);
        expect(new Set(question?.options)).toEqual(new Set(alternatives));
      }
    },
  );

  it('skips targets when excluding relatives leaves fewer than three distractors', () => {
    const current = context('few-unrelated');
    current.pool = current.pool.filter(({ name }) =>
      ['mothim', 'butterfree', 'burmy', 'caterpie', 'ponyta'].includes(name),
    );
    expect(buildQuestionType(current, 'type-twins')).toBeUndefined();
  });
});

describe('Legend hunt', () => {
  it.each(generations)(
    'uses only the selected Generation %s with two or three Legendary or Mythical answers',
    (generation) => {
      for (let seed = 0; seed < 10; seed += 1) {
        const question = buildQuestionType(
          context(`legends-${seed}`, [generation]),
          'legend-hunt',
        );
        expect(question).toBeDefined();
        if (!question) throw new Error('Missing Legend hunt question');
        expect(question.answer.interaction).toBe('multi-select');
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options).size).toBe(4);
        expect([2, 3]).toContain(question.answer.correctOptions.length);
        const matches = question.options.filter(
          (name) =>
            catalog.pokemon[name]!.isLegendary ||
            catalog.pokemon[name]!.isMythical,
        );
        expect(matches.toSorted()).toEqual(
          question.answer.correctOptions.toSorted(),
        );
        for (const name of question.options) {
          const pokemon = catalog.pokemon[name]!;
          expect(pokemon.generation).toBe(generation);
          expect(question.optionClassifications?.[name]).toBe(
            pokemon.isMythical
              ? 'Mythical'
              : pokemon.isLegendary
                ? 'Legendary'
                : 'Neither',
          );
        }
      }
    },
  );

  it('includes both Legendary and Mythical Pokémon and ordinary distractors', () => {
    const current = context('both-kinds');
    current.pool = current.pool.filter(({ name }) =>
      ['mewtwo', 'mew', 'pikachu', 'eevee'].includes(name),
    );
    const question = buildQuestionType(current, 'legend-hunt');
    expect(question?.answer.correctOptions.toSorted()).toEqual([
      'mew',
      'mewtwo',
    ]);
    expect(question?.optionClassifications).toEqual({
      mew: 'Mythical',
      mewtwo: 'Legendary',
      pikachu: 'Neither',
      eevee: 'Neither',
    });
  });

  it('skips pools without enough matches instead of presenting an invalid answer key', () => {
    const current = context('no-legends');
    current.pool = current.pool.filter(
      ({ pokemon }) => !pokemon.isLegendary && !pokemon.isMythical,
    );
    expect(buildQuestionType(current, 'legend-hunt')).toBeUndefined();
  });
});
