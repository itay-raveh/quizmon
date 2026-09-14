import {
  createQuestionContext,
  catalog,
} from '../../../../tests/fixtures/catalog';
import { emptyQuestionHistory } from '../question-history';
import { buildQuestionType } from './registry';
import { orderEncounterLocations } from './encounter-order';

const example = catalog.topics!.encounters[0]!;
const forest = {
  ...example,
  area: 'zone-forest',
  region: 'johto',
  label: 'Johto Safari Zone (Safari Zone Forest)',
};
const marsh = {
  ...forest,
  area: 'zone-marsh',
  label: 'Johto Safari Zone (Safari Zone Marshland)',
};
const route = {
  ...example,
  area: 'route-1',
  region: 'johto',
  label: 'Route 1 (Main Area)',
};

it('does not give a location more chances when it has more encounter records', () => {
  for (let seed = 0; seed < 30; seed++) {
    const first = orderEncounterLocations(createQuestionContext(String(seed)), [
      forest,
      route,
    ])[0]!;
    const duplicated = orderEncounterLocations(
      createQuestionContext(String(seed)),
      [...Array.from({ length: 100 }, () => forest), route],
    )[0]!;
    expect(duplicated.area).toBe(first.area);
  }
});

it('avoids the whole recently seen location, including its other areas', () => {
  const context = createQuestionContext('recent-zone');
  context.history = {
    ...emptyQuestionHistory(),
    sequence: 1,
    subjects: { 'encounter-locations:location/zone-forest': 1 },
  };
  expect(
    orderEncounterLocations(context, [forest, marsh, route])[0]!.area,
  ).toBe('route-1');
});

it.each(['III', 'IV', 'V'] as const)(
  'can generate Level 5 ordinary encounters in generation %s',
  (generation) => {
    const context = createQuestionContext(`ordinary-${generation}`, [
      generation,
    ]);
    context.difficulty = 5;
    const question = buildQuestionType(context, 'encounter-locations');
    expect(question).toBeDefined();
    expect(question!.options).toHaveLength(4);
    expect(question!.subject.name).not.toMatch(/^johto-safari-zone/);
  },
);
