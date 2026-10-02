import catalog from '../../pokemon/data/pokemon.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { gameLevels } from '../level.ts';
import { leagueStages } from '../league.ts';
import { getQuestionVariant } from '../variants.ts';
import { buildQuestionType } from './registry.ts';
import { redactName } from './prompts.ts';
import {
  createPokemonSearchEntry,
  createSearch,
} from '../../pokemon/search.ts';

const ambiguous = ['celesteela', 'kartana', 'pheromosa'];
const names = [
  ...ambiguous,
  'mew',
  'bulbasaur',
  'charmander',
  'squirtle',
  'voltorb',
  'sharpedo',
  'sharpedo-mega',
];
const pokemon = catalog.pokemon as unknown as PokemonCatalog['pokemon'];
const pool = names.map((name) => ({ name, pokemon: pokemon[name]! }));

it('keeps duplicate catalog clues out of Field Notes and the League finale', () => {
  const clues = ambiguous.map((name) =>
    redactName(pokemon[name]!.description, name, pokemon[name]!.speciesName),
  );
  expect(new Set(clues).size).toBe(1);

  const cases = [
    ...gameLevels
      .filter((level) => getQuestionVariant('pokedexEntryMatch', level))
      .map((level) => ({
        questionType: 'pokedexEntryMatch' as const,
        level,
      })),
    {
      questionType: 'champion' as const,
      level: leagueStages.at(-1)!.level,
    },
  ];
  for (const { questionType, level } of cases) {
    const question = buildQuestionType(
      {
        catalog: catalog as unknown as PokemonCatalog,
        pool,
        random: createSeededRandom(
          `duplicate-description:${questionType}:${level}`,
        ),
        used: new Set(),
        level,
      },
      questionType,
    );
    expect(question, `${questionType} level ${level}`).toBeDefined();
    for (const name of ambiguous) {
      expect(question!.subject.name).not.toBe(name);
      expect(question!.options).not.toContain(name);
    }
    if (question!.searchOptions) {
      const search = createSearch(
        question!.searchOptions.map(createPokemonSearchEntry),
      );
      expect(search('voltorb').map(({ name }) => name)).toContain('voltorb');
      expect(search('sharpedo')[0]?.name).toBe('sharpedo');
    }
  }
});
