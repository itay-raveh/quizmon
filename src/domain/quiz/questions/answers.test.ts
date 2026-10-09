import pokemonData from '../../pokemon/data/pokemon.json' with { type: 'json' };
import { generations, type PokemonKnowledge } from '../../pokemon/types.ts';
import { parsePokemonCatalog } from '../../pokemon/catalog.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { getQuestionVariant } from '../variants.ts';
import { gameLevels } from '../level.ts';
import { buildQuestionType } from './registry.ts';
import { mergeRendering, sampleRendering } from '../rendering.ts';
import { createPokemonSimilarityScorer, pokemonOptions } from './answers.ts';

const target = {
  ...pokemonData.pokemon.bulbasaur,
  generation: generations.find(
    (generation) => generation === pokemonData.pokemon.bulbasaur.generation,
  )!,
  identitySprites: { currentBack: null, generations: [] },
  spriteMeasurements: [0.4, 0.6, 0.3, 0.5, 0.9],
} satisfies PokemonKnowledge;
const typeOnly = {
  type: 100,
  shape: 0,
  color: 0,
  evolutionStage: 0,
  proportions: 0,
  height: 0,
};

it('bounds type overlap so dual types cannot double the ranking budget', () => {
  const dual = createPokemonSimilarityScorer(target, typeOnly);
  const monoTarget = { ...target, types: target.types.slice(0, 1) };
  const mono = createPokemonSimilarityScorer(monoTarget, typeOnly);
  expect(dual(target)).toBe(mono(monoTarget));
  expect(dual(monoTarget)).toBeLessThan(dual(target));
  expect(dual({ ...target, types: ['electric'] })).toBe(0);
  expect(
    dual({ ...target, generation: 'IX', stats: { ...target.stats, hp: 999 } }),
  ).toBe(dual(target));
});

it('uses bounded front-reference proportions and ignores unavailable measurements', () => {
  const score = createPokemonSimilarityScorer(target, {
    ...typeOnly,
    type: 0,
    proportions: 30,
  });
  const similar = {
    ...target,
    spriteMeasurements: [0.5, 0.8, 0.4, 0.5, 1],
  } satisfies PokemonKnowledge;
  const narrow = {
    ...target,
    spriteMeasurements: [0.4, 0.3, 0.6, 0.5, 1],
  } satisfies PokemonKnowledge;
  expect(score(similar)).toBe(score(target));
  expect(score(narrow)).toBeGreaterThan(0);
  expect(score(narrow)).toBeLessThan(score(similar));
  expect(score({ ...target, spriteMeasurements: null })).toBe(0);
  expect(score({ ...target, spriteMeasurements: [0, 0, 0, 0, 0] })).toBe(0);
  expect(
    createPokemonSimilarityScorer(
      { ...target, spriteMeasurements: null },
      { ...typeOnly, proportions: 30 },
    )(target),
  ).toBe(typeOnly.type);
});

it.each(['subject', 'choices'] as const)(
  'ranks distractors from the sampled %s appearance and reuses that appearance without resampling',
  (role) => {
    const names = [
      'color-a',
      'color-b',
      'color-c',
      'shape-a',
      'shape-b',
      'shape-c',
    ];
    const pokemon = Object.fromEntries<PokemonKnowledge>([
      ['target', target],
      ...names.map(
        (name, index) =>
          [
            name,
            {
              ...target,
              speciesId: target.speciesId + index + 1,
              speciesName: name,
              evolutionFamily: target.evolutionFamily + index + 1,
              sprite: `/sprite-${name}.png`,
              shape: index < 3 ? 'different-shape' : target.shape,
              color: index < 3 ? target.color : 'different-color',
            },
          ] as const,
      ),
    ]);
    const catalog = { pokemon, typeRelations: {} };
    const pool = Object.entries(pokemon).map(([name, pokemon]) => ({
      name,
      pokemon,
    }));
    const rules = getQuestionVariant('pokemonIdentification', 2)!.variant;
    const select = (roll: number) => {
      const rendering = sampleRendering(
        mergeRendering(rules.rendering, {
          [role]: { sprite: { silhouetteChance: 0.5 } },
        }),
        () => roll,
      );
      const options = pokemonOptions(
        {
          catalog,
          pool,
          used: new Set(),
          random: createSeededRandom('appearance'),
          variant: {
            ...rules,
            rendering,
            similarityRole: role === 'subject' ? undefined : role,
            similarityWeights: { ...typeOnly, type: 0, color: 100 },
            silhouetteWeights: { shape: 100 },
            distractorPoolSize: 3,
            smallPoolPolicy: 'fixed-size',
            distantSpeciesFraction: 0,
          },
        },
        { correct: { name: 'target', pokemon: target } },
      );
      // A persisted sampled policy must not consume randomness or switch any axis.
      const reused = sampleRendering(rendering, () => {
        throw new Error('Resampled appearance');
      });
      expect(reused).toEqual(rendering);
      return options.filter((name) => name !== 'target').sort();
    };
    expect(select(0)).toEqual(names.slice(3).sort());
    expect(select(0.99)).toEqual(names.slice(0, 3).sort());
  },
);

const catalog = parsePokemonCatalog(pokemonData);
const generationOnePool = Object.entries(catalog.pokemon)
  .filter(([, pokemon]) => pokemon.generation === 'I')
  .map(([name, pokemon]) => ({ name, pokemon }));
const bulbasaur = generationOnePool.find(({ name }) => name === 'bulbasaur')!;

const recognitionTypes = [
  'pokemonMatch',
  'pokemonIdentification',
  'pokemonFromPixelCrop',
  'shinyPokemonIdentification',
] as const;

it.each(recognitionTypes)(
  'generates valid deterministic %s choices without target evolution relatives at every level',
  (type) => {
    for (const level of gameLevels) {
      for (let seed = 0; seed < 4; seed++) {
        const generate = () =>
          buildQuestionType(
            {
              catalog,
              pool: generationOnePool,
              generations: ['I'],
              level,
              used: new Set(),
              random: createSeededRandom(`unrelated:${level}:${seed}`),
            },
            type,
          );
        const question = generate()!;
        expect(question).toBeDefined();
        expect(question.options).toContain(question.subject.name);
        const family = catalog.pokemon[question.subject.name]!.evolutionFamily;
        const wrong = question.options.filter(
          (name) => !question.answer.correctOptions.includes(name),
        );
        expect(
          wrong.every(
            (name) => catalog.pokemon[name]!.evolutionFamily !== family,
          ),
        ).toBe(true);
        if (question.answer.interaction !== 'search')
          expect(new Set(question.options).size).toBe(4);
        expect(generate()).toEqual(question);
      }
    }
  },
);

it.each(['eevee', 'vaporeon'])(
  'excludes the entire branching evolution family of %s',
  (name) => {
    const pool = Object.entries(catalog.pokemon).map(([name, pokemon]) => ({
      name,
      pokemon,
    }));
    const correct = pool.find((candidate) => candidate.name === name)!;
    const options = pokemonOptions(
      {
        catalog,
        pool,
        used: new Set(),
        random: createSeededRandom('branching-evolution'),
        variant: getQuestionVariant('pokemonMatch', 5)!.variant,
      },
      { correct },
    );
    expect(new Set(options).size).toBe(4);
    expect(options).toContain(name);
    expect(
      options
        .filter((option) => option !== name)
        .every(
          (option) =>
            catalog.pokemon[option]!.evolutionFamily !==
            correct.pokemon.evolutionFamily,
        ),
    ).toBe(true);
  },
);

it('rejects incomplete recognition pickers without restoring forbidden relatives', () => {
  const pool = generationOnePool.filter(
    ({ pokemon }) =>
      pokemon.evolutionFamily === bulbasaur.pokemon.evolutionFamily,
  );
  for (const type of recognitionTypes) {
    const context = {
      catalog,
      pool,
      level: 3 as const,
      used: new Set<string>(),
      random: createSeededRandom('only-relatives'),
    };
    expect(
      pokemonOptions(
        { ...context, variant: getQuestionVariant(type, 3)!.variant },
        { correct: bulbasaur },
      ),
    ).toEqual([bulbasaur.name]);
    expect(buildQuestionType(context, type)).toBeUndefined();
  }
});

it('keeps relatives eligible when another family allows them or recognition overrides the exclusion', () => {
  const names = ['bulbasaur', 'ivysaur', 'venusaur', 'bellsprout'];
  const pool = generationOnePool.filter(({ name }) => names.includes(name));
  for (const variant of [
    getQuestionVariant('pokedexEntryMatch', 4)!.variant,
    {
      ...getQuestionVariant('pokemonMatch', 5)!.variant,
      allowEvolutionRelatives: true,
    },
  ]) {
    const options = pokemonOptions(
      {
        catalog,
        pool,
        used: new Set(),
        random: createSeededRandom('allowed-relatives'),
        variant,
      },
      { correct: bulbasaur },
    );
    expect([...options].sort()).toEqual([...names].sort());
  }
});
