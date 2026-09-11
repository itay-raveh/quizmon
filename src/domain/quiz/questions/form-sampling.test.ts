import {
  catalog,
  createQuestionContext,
} from '../../../../tests/fixtures/catalog';
import { emptyQuestionHistory } from '../question-history';
import { pokemonOptions } from './answers';
import type { Candidate } from './context';
import { buildQuestionType } from './registry';
import { pickForm, pokemonWeight, speciesWeight } from './sampling';
import { chooseTargets, pickFreshTarget } from './selection';
import { getSpeciesHistory, speciesQuestion } from './species-history';

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

const forms = (id: number): Candidate[] =>
  [
    `species-${id}`,
    `species-${id}-alola`,
    `species-${id}-mega-x`,
    `species-${id}-mega-y`,
  ].map((name) => ({
    name,
    pokemon: {
      ...catalog.pokemon.pikachu!,
      speciesId: id,
      speciesName: `species-${id}`,
      sprite: `/sprite/${name}.png`,
    },
  }));

const contextFor = (candidates: Candidate[], seed: string) => {
  const context = createQuestionContext(seed);
  context.catalog = {
    ...catalog,
    pokemon: Object.fromEntries(
      candidates.map(({ name, pokemon }) => [name, pokemon]),
    ),
  };
  context.pool = candidates;
  return context;
};

it('weights categories 4:2:1 without giving extra tickets to multiple Mega forms', () => {
  const candidates = forms(1);
  const selected = Array.from({ length: 700 }, (_, i) =>
    pickForm(candidates, () => (i + 0.5) / 700)!,
  );
  expect(
    [4, 2, 1].map(
      (weight) =>
        selected.filter(({ name }) => pokemonWeight(name) === weight).length,
    ),
  ).toEqual([400, 200, 100]);
  expect(pickForm([], () => 0)).toBeUndefined();
  const regionalAndMega = candidates.slice(1);
  const limited = Array.from({ length: 300 }, (_, i) =>
    pickForm(regionalAndMega, () => (i + 0.5) / 300)!,
  );
  expect(limited.filter(({ name }) => pokemonWeight(name) === 2)).toHaveLength(
    200,
  );
});

it('selects species uniformly regardless of their number of forms', () => {
  const candidates = [...forms(1), forms(2)[0]!];
  const context = contextFor(candidates, 'species-frequency');
  let firstSpecies = 0;
  const transformed = new Set<string>();
  for (let i = 0; i < 6000; i++) {
    const selected = pickFreshTarget(context, candidates)!;
    firstSpecies += Number(selected.pokemon.speciesId === 1);
    if (pokemonWeight(selected.name) === 1) transformed.add(selected.name);
  }
  expect(Math.abs(firstSpecies - 3000)).toBeLessThan(180);
  expect(transformed.size).toBe(2);
});

it('rotates Daily species without assigning extra slots to their forms', () => {
  const candidates = [...forms(1), forms(2)[0]!];
  const context = contextFor(candidates, 'species-daily');
  context.questionType = 'type-check';
  const selected = Array.from({ length: 6 }, (_, rotation) => {
    context.rotation = rotation;
    const selected = pickFreshTarget(context, candidates)!;
    expect(chooseTargets(context, candidates, 2)).toHaveLength(2);
    return selected.pokemon.speciesId;
  });
  expect(selected.filter((id) => id === 1)).toHaveLength(3);
});

it('treats an unseen form of a used or previously seen species as a repeat', () => {
  const candidates = [...forms(1), forms(2)[0]!];
  const context = contextFor(candidates, 'species-history');
  context.used.add('species-1');
  expect(pickFreshTarget(context, candidates)?.pokemon.speciesId).toBe(2);
  context.used.clear();
  context.history = {
    ...emptyQuestionHistory(),
    sequence: 1,
    pokemon: { 'species-1': 1 },
  };
  expect(pickFreshTarget(context, candidates)?.pokemon.speciesId).toBe(2);
  const onlyMegas = candidates.filter(({ name }) => name.includes('mega'));
  expect(onlyMegas).toContainEqual(pickFreshTarget(context, onlyMegas));
});

it('keeps category weights after species-level history selection', () => {
  const candidates = forms(1);
  const context = contextFor(candidates, 'category-history');
  context.history = {
    ...emptyQuestionHistory(),
    sequence: 1,
    pokemon: { 'species-1': 1 },
  };
  const counts = [0, 0, 0];
  for (let i = 0; i < 7000; i++) {
    const selected = pickFreshTarget(context, candidates)!;
    counts[[4, 2, 1].indexOf(pokemonWeight(selected.name))]!++;
  }
  for (const [index, expected] of [4000, 2000, 1000].entries())
    expect(Math.abs(counts[index]! - expected)).toBeLessThan(180);
});

it('shortlists distractor species and then chooses among all their eligible forms', () => {
  const candidates = [...forms(1), ...forms(2), ...forms(3), forms(4)[0]!];
  const context = contextFor(candidates, 'species-options');
  const target = candidates.at(-1)!;
  context.history = {
    ...emptyQuestionHistory(),
    sequence: 1,
    distractors: { 'species-1': 1, 'species-2': 1, 'species-3': 1 },
  };
  const counts = [0, 0, 0];
  for (let i = 0; i < 1000; i++) {
    const options = pokemonOptions(context, { correct: target });
    expect(options).toHaveLength(4);
    expect(options).toContain(target.name);
    expect(
      new Set(options.map((name) => context.catalog.pokemon[name]!.speciesId))
        .size,
    ).toBe(4);
    for (const name of options.filter((name) => name !== target.name))
      counts[[4, 2, 1].indexOf(pokemonWeight(name))]!++;
  }
  expect(counts[0]! / counts[1]!).toBeGreaterThan(1.7);
  expect(counts[0]! / counts[1]!).toBeLessThan(2.3);
  expect(counts[1]! / counts[2]!).toBeGreaterThan(1.7);
  expect(counts[1]! / counts[2]!).toBeLessThan(2.3);
});

it('merges old form history and question identities without changing saved data', () => {
  const context = contextFor(forms(1), 'legacy-species');
  context.history = {
    ...emptyQuestionHistory(),
    sequence: 4,
    pokemon: { 'species-1': 2, 'species-1-mega-x': 4 },
    distractors: { 'species-1-alola': 3 },
    subjects: { 'type-check:species-1-mega-y': 4 },
    questions: { 'type:species-1-mega-x': 3 },
  };
  const original = structuredClone(context.history);
  const savedHistory = context.history;
  expect(getSpeciesHistory(context)).toMatchObject({
    pokemon: { 'species-1': 4 },
    distractors: { 'species-1': 3 },
    subjects: { 'type-check:species-1': 4 },
    questions: { 'type:species-1': 3 },
  });
  const question = buildQuestionType(context, 'type-check')!;
  expect(speciesQuestion(context.catalog, question).repetition.identity).toBe(
    'species-1',
  );
  expect(savedHistory).toEqual(original);
  expect(original.pokemon).toEqual({ 'species-1': 2, 'species-1-mega-x': 4 });
});

it('does not favor an unseen Mega when comparing assembled questions', () => {
  const context = contextFor(forms(1), 'assembled-category-history');
  const history = {
    ...emptyQuestionHistory(),
    sequence: 1,
    pokemon: { 'species-1': 1 },
    subjects: { 'type-check:species-1': 1 },
    questions: { 'type-check:species-1': 1 },
  };
  let ordinary = 0;
  for (let i = 0; i < 700; i++) {
    context.history = history;
    context.used.clear();
    const question = buildQuestionType(context, 'type-check')!;
    ordinary += Number(pokemonWeight(question.pokemonName) === 4);
  }
  expect(Math.abs(ordinary - 400)).toBeLessThan(60);
});

it('weights species by their best eligible category without adding form weights', () => {
  expect(speciesWeight(forms(1))).toBe(4);
  expect(speciesWeight(forms(1).slice(1))).toBe(2);
  expect(speciesWeight(forms(1).slice(2))).toBe(1);
});

it.each([false, true])(
  'preserves species rarity with history=%s',
  (withHistory) => {
    const candidates = [forms(1)[0]!, forms(2)[1]!, ...forms(3).slice(2)];
    const context = contextFor(candidates, 'eligible-species-rarity');
    if (withHistory) {
      context.history = {
        ...emptyQuestionHistory(),
        sequence: 2,
        pokemon: { 'species-1': 2, 'species-2': 1 },
      };
      context.used.add('species-1');
    }
    const counts = [0, 0, 0];
    for (let i = 0; i < 7000; i++) {
      const selected = pickFreshTarget(context, candidates)!;
      counts[selected.pokemon.speciesId - 1]!++;
    }
    for (const [index, expected] of [4000, 2000, 1000].entries())
      expect(Math.abs(counts[index]! - expected)).toBeLessThan(180);
  },
);

it('preserves species rarity across a complete Daily rotation', () => {
  const candidates = [forms(1)[0]!, forms(2)[1]!, ...forms(3).slice(2)];
  const context = contextFor(candidates, 'daily-eligible-rarity');
  context.questionType = 'type-check';
  const counts = [0, 0, 0];
  for (let rotation = 0; rotation < 7; rotation++) {
    context.rotation = rotation;
    counts[pickFreshTarget(context, candidates)!.pokemon.speciesId - 1]!++;
  }
  expect(counts).toEqual([4, 2, 1]);
});

it('keeps the first draft rarity when history compares different species', () => {
  const candidates = [forms(1)[0]!, forms(2)[1]!, ...forms(3).slice(2)];
  for (let i = 0; i < 100; i++) {
    const fresh = contextFor(candidates, `draft-rarity-${i}`);
    const returning = contextFor(candidates, `draft-rarity-${i}`);
    returning.history = {
      ...emptyQuestionHistory(),
      sequence: 2,
      pokemon: { 'species-1': 2, 'species-2': 1 },
    };
    expect(
      pokemonWeight(buildQuestionType(returning, 'type-check')!.pokemonName),
    ).toBe(pokemonWeight(buildQuestionType(fresh, 'type-check')!.pokemonName));
  }
});
