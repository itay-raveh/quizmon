import catalog from '../../pokemon/data/pokemon.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { buildQuestionType } from './registry.ts';
import { redactName } from './prompts.ts';

const ambiguous = ['celesteela', 'kartana', 'pheromosa'];
const names = [...ambiguous, 'mew', 'bulbasaur', 'charmander', 'squirtle'];
const pokemon = catalog.pokemon as unknown as PokemonCatalog['pokemon'];
const pool = names.map((name) => ({ name, pokemon: pokemon[name]! }));

it('keeps duplicate catalog clues out of Field Notes and the League finale', () => {
  const clues = ambiguous.map((name) =>
    redactName(pokemon[name]!.description, name, pokemon[name]!.speciesName),
  );
  expect(new Set(clues).size).toBe(1);

  for (const [questionType, difficulty] of [
    ['field-notes', 3],
    ['field-notes', 4],
    ['champion', undefined],
  ] as const) {
    const question = buildQuestionType(
      {
        catalog: catalog as unknown as PokemonCatalog,
        pool,
        random: createSeededRandom(
          `duplicate-description:${questionType}:${difficulty}`,
        ),
        used: new Set(),
        ...(difficulty ? { difficulty } : {}),
      },
      questionType,
    );
    expect(question, `${questionType} level ${difficulty}`).toBeDefined();
    for (const name of ambiguous) {
      expect(question!.subject.name).not.toBe(name);
      expect(question!.options).not.toContain(name);
      expect(
        question!.searchOptions?.map((option) => option.name) ?? [],
      ).not.toContain(name);
    }
  }
});
