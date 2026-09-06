import catalogData from '@/game/data/pokemon.json';
import { getTrainingSettingsValidation } from '@/components/trainingSettingsModel';
import {
  buildQuestions,
  defaultModifiers,
  getTrainingModifiers,
} from '@/game/game';
import { buildQuestionType } from '@/game/questions/registry';
import { createSeededRandom } from '@/game/random';
import {
  generations,
  type PokemonCatalog,
  type Generation,
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

describe('Evolution link', () => {
  it.each(generations)(
    'builds valid text-only chains and four middle-stage choices in Generation %s',
    (generation) => {
      for (let seed = 0; seed < 15; seed += 1) {
        const question = buildQuestionType(
          context(`link-${seed}`, [generation]),
          'evolution-link',
        );
        expect(question).toBeDefined();
        if (question?.visual?.kind !== 'evolution-link')
          throw new Error('Missing evolution chain');
        const { before, after } = question.visual;
        const correct = question.answer.correctOptions[0]!;
        expect(catalog.pokemon[before]!.evolvesTo).toContain(correct);
        expect(catalog.pokemon[correct]!.evolvesTo).toEqual([after]);
        expect(catalog.pokemon[after]!.evolvesFrom).toBe(correct);
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options).size).toBe(4);
        expect(question.options).not.toContain(before);
        expect(question.options).not.toContain(after);
        for (const name of [before, after, ...question.options]) {
          expect(catalog.pokemon[name]!.generation).toBe(generation);
        }
        for (const name of question.options) {
          expect(catalog.pokemon[name]!.evolvesFrom).not.toBeNull();
          expect(catalog.pokemon[name]!.evolvesTo.length).toBeGreaterThan(0);
        }
        expect(question.media).toEqual({ kind: 'none' });
        expect(question.optionVisuals).toBeUndefined();
        expect(question.optionDexNumbers).toBeUndefined();
      }
    },
  );

  it('rejects branching answers and regional-form-only links', () => {
    for (const target of ['kirlia', 'linoone', 'mr-mime']) {
      const current = context('ambiguous');
      const pokemon = catalog.pokemon[target]!;
      const names = new Set([
        target,
        pokemon.evolvesFrom,
        ...pokemon.evolvesTo,
        'ivysaur',
        'charmeleon',
        'wartortle',
      ]);
      current.pool = current.pool.filter(({ name }) => names.has(name));
      expect(buildQuestionType(current, 'evolution-link')).toBeUndefined();
    }
  });
});

describe('Generation roundup', () => {
  it('produces two or three correct choices from selected generations and reveals metadata for all four', () => {
    const counts = new Set<number>();
    for (let seed = 0; seed < 30; seed += 1) {
      const question = buildQuestionType(
        context(`roundup-${seed}`, ['I', 'II']),
        'generation-roundup',
      );
      expect(question).toBeDefined();
      if (!question) throw new Error('Missing roundup');
      expect(question.answer.interaction).toBe('multi-select');
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      const correctGeneration =
        catalog.pokemon[question.pokemonName]!.generation;
      expect(question.prompt).toEqual({
        kind: 'text',
        text: `Select every Pokémon introduced in Generation ${correctGeneration}.`,
      });
      expect(question.answer.correctOptions.toSorted()).toEqual(
        question.options
          .filter(
            (name) => catalog.pokemon[name]!.generation === correctGeneration,
          )
          .toSorted(),
      );
      counts.add(question.answer.correctOptions.length);
      for (const name of question.options) {
        expect(['I', 'II']).toContain(catalog.pokemon[name]!.generation);
        expect(question.optionGenerations?.[name]).toBe(
          catalog.pokemon[name]!.generation,
        );
      }
      expect(question.optionDexNumbers).toBeUndefined();
    }
    expect(counts).toEqual(new Set([2, 3]));
  });

  it('skips single-generation pools without shortening League Training or widening filters', () => {
    expect(
      buildQuestionType(context('one', ['I']), 'generation-roundup'),
    ).toBeUndefined();
    const questions = buildQuestions(
      catalog,
      getTrainingModifiers({
        ...defaultModifiers,
        generations: ['I'],
        trainingMode: 'league',
      }),
      createSeededRandom('single-gen'),
    );
    expect(questions).toHaveLength(10);
    expect(
      questions.every(
        (question) =>
          question.generation === 'I' &&
          question.questionType !== 'generation-roundup',
      ),
    ).toBe(true);
  });

  it('requires two generations whenever Custom includes Generation roundup', () => {
    const modifiers = {
      ...defaultModifiers,
      generations: ['I'] as Generation[],
      trainingMode: 'custom' as const,
      questionTypes: ['generation-roundup'] as const,
    };
    expect(
      getTrainingSettingsValidation(catalog, {
        ...modifiers,
        questionTypes: [...modifiers.questionTypes],
      }).isValid,
    ).toBe(false);
    expect(
      getTrainingSettingsValidation(catalog, {
        ...modifiers,
        questionTypes: [...modifiers.questionTypes],
        generations: ['I', 'II'],
      }).isValid,
    ).toBe(true);
    expect(
      getTrainingSettingsValidation(catalog, {
        ...modifiers,
        questionTypes: ['generation-roundup', 'evolution-link'],
      }).isValid,
    ).toBe(false);
    expect(
      getTrainingSettingsValidation(catalog, {
        ...modifiers,
        questionTypes: ['evolution-link'],
      }).isValid,
    ).toBe(true);
    expect(
      getTrainingSettingsValidation(catalog, {
        ...modifiers,
        questionTypes: ['generation-roundup'],
        trainingMode: 'league',
      }).isValid,
    ).toBe(true);
  });
});
