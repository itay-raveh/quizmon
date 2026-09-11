import { pokemonOptions } from '@/game/questions/answers';
import {
  pickPokemon,
  pokemonWeight,
  shufflePokemon,
} from '@/game/questions/sampling';
import {
  chooseTargets,
  orderTargets,
  pickFreshTarget,
} from '@/game/questions/selection';
import { createSeededRandom } from '@/game/random';
import { catalog, createQuestionContext } from './fixtures/catalog';

it.each([
  ['pikachu', 4],
  ['rotom-wash', 4],
  ['lycanroc-dusk', 4],
  ['urshifu-rapid-strike', 4],
  ['raichu-alola', 2],
  ['darmanitan-galar-standard', 2],
  ['typhlosion-hisui', 2],
  ['tauros-paldea-aqua-breed', 2],
  ['charizard-mega-x', 1],
  ['charizard-mega-y', 1],
  ['zygarde-mega', 1],
  ['pikachu-gmax', 1],
  ['urshifu-rapid-strike-gmax', 1],
])('assigns %s weight %s', (name, expected) => {
  expect(pokemonWeight(name)).toBe(expected);
});

const names = ['pikachu', 'raichu-alola', 'charizard-mega-x'];

it('selects targets in exact 4:2:1 probability intervals', () => {
  const selected = Array.from({ length: 700 }, (_, i) =>
    pickPokemon(names, () => (i + 0.5) / 700),
  );
  expect(
    names.map((name) => selected.filter((value) => value === name).length),
  ).toEqual([400, 200, 100]);
  expect(pickPokemon([], () => 0)).toBeUndefined();
});

it('weights the first draw without duplicating or dropping choices', () => {
  const random = createSeededRandom('weighted-first-draw');
  const counts = new Map(names.map((name) => [name, 0]));
  for (let i = 0; i < 14000; i++) {
    const result = shufflePokemon(names, random);
    expect([...result].sort()).toEqual([...names].sort());
    counts.set(result[0]!, counts.get(result[0]!)! + 1);
  }
  for (const [i, expected] of [8000, 4000, 2000].entries())
    expect(Math.abs(counts.get(names[i]!)! - expected)).toBeLessThan(250);
});

it('rotates Daily targets in 4:2:1 proportions with unique multi-choice selections', () => {
  const context = createQuestionContext('weighted-daily');
  const candidates = names.map((name) => ({
    name,
    pokemon: catalog.pokemon[name]!,
  }));
  context.questionType = 'type-check';
  const selected = Array.from({ length: 7 }, (_, rotation) => {
    context.rotation = rotation;
    const ordered = orderTargets(context, candidates);
    expect(new Set(ordered.map(({ name }) => name)).size).toBe(3);
    expect(chooseTargets(context, candidates, 3)).toHaveLength(3);
    return ordered[0]!.name;
  });
  expect(
    names.map((name) => selected.filter((value) => value === name).length),
  ).toEqual([4, 2, 1]);
});

it('keeps every form available and favors an unused form over a used ordinary entry', () => {
  const context = createQuestionContext('weighted-freshness');
  const candidates = names.map((name) => ({
    name,
    pokemon: catalog.pokemon[name]!,
  }));
  for (const candidate of candidates)
    expect(pickFreshTarget(context, [candidate])).toEqual(candidate);
  context.used = new Set(names.slice(0, 2));
  expect(pickFreshTarget(context, candidates)?.name).toBe(names[2]);
});

it('weights Pokémon distractors while keeping the correct answer and four distinct options', () => {
  const context = createQuestionContext('weighted-options');
  const ordinary = Array.from({ length: 6 }, (_, i) => `ordinary-${i}`);
  const regional = Array.from({ length: 6 }, (_, i) => `regional-${i}-alola`);
  const mega = Array.from({ length: 6 }, (_, i) => `special-${i}-mega`);
  const target = { name: 'pikachu', pokemon: catalog.pokemon.pikachu! };
  context.catalog = { ...catalog, pokemon: { ...catalog.pokemon } };
  context.pool = [...ordinary, ...regional, ...mega].map((name, index) => ({
    name,
    pokemon: {
      ...target.pokemon,
      speciesName: name,
      speciesId: 100 + (index % 6) * 3 + Math.floor(index / 6),
    },
  }));
  for (const { name, pokemon } of context.pool)
    context.catalog.pokemon[name] = pokemon;
  const counts = [0, 0, 0];
  for (let i = 0; i < 3000; i++) {
    const options = pokemonOptions(context, { correct: target });
    expect(options).toContain(target.name);
    expect(new Set(options).size).toBe(4);
    for (const [index, group] of [ordinary, regional, mega].entries())
      counts[index]! += options.filter((name) => group.includes(name)).length;
  }
  expect(counts[0]!).toBeGreaterThan(counts[1]! * 1.5);
  expect(counts[1]!).toBeGreaterThan(counts[2]! * 1.5);
});
