import { catalog } from '../../../tests/fixtures/catalog';
import { createSeededRandom } from '../../lib/random';
import { buildQuestions } from '../quiz/question-generation';
import { isQuestionData } from '../quiz/question-lineup';
import { defaultGameSettings } from '../settings/game-settings';
import { getPixelPeekCrop } from './pixel-peek';
import { getPixelPeekFocusPoints } from './pixel-peek-focus';

it('keeps measured crops inside visible sprite bounds across the catalog', () => {
  for (const pokemon of Object.values(catalog.pokemon)) {
    if (!pokemon.sprite) {
      expect(pokemon.spriteMeasurements).toBeNull();
      continue;
    }
    const measurements = pokemon.spriteMeasurements!;
    const [, width, height, centerX, bottom] = measurements;
    for (const x of [0, 0.5, 0.99]) {
      for (const y of [0, 0.5, 0.99]) {
        let calls = 0;
        const crop = getPixelPeekCrop(measurements, () =>
          calls++ === 0 ? x : y,
        );
        const size = 1 / crop.zoom!;
        expect(size).toBeGreaterThan(0);
        expect(size).toBeLessThan(Math.max(width, height));
        const focusX = crop.focusX / 100;
        const focusY = crop.focusY / 100;
        expect(focusX).toBeGreaterThanOrEqual(centerX - width / 2);
        expect(focusX).toBeLessThanOrEqual(centerX + width / 2);
        expect(focusY).toBeGreaterThanOrEqual(bottom - height);
        expect(focusY).toBeLessThanOrEqual(bottom);
        if (width >= size) {
          expect(focusX - size / 2).toBeGreaterThanOrEqual(
            centerX - width / 2 - 1e-9,
          );
          expect(focusX + size / 2).toBeLessThanOrEqual(
            centerX + width / 2 + 1e-9,
          );
        }
        if (height >= size) {
          expect(focusY - size / 2).toBeGreaterThanOrEqual(
            bottom - height - 1e-9,
          );
          expect(focusY + size / 2).toBeLessThanOrEqual(bottom + 1e-9);
        }
      }
    }
  }
}, 15_000);

it('softens zoom for small sprites and tightens it for large sprites', () => {
  const small = getPixelPeekCrop(
    catalog.pokemon.cleffa!.spriteMeasurements,
    () => 0.5,
  );
  const large = getPixelPeekCrop(
    catalog.pokemon.celesteela!.spriteMeasurements,
    () => 0.5,
  );
  expect(small.zoom).toBeGreaterThan(large.zoom!);
  expect(small.zoom).toBeCloseTo(9.6559, 3);
  expect(large.zoom).toBe(3.5);
});

it('retains the legacy crop when measurements are unavailable', () => {
  expect(getPixelPeekCrop(null, () => 0)).toEqual({ focusX: 25, focusY: 25 });
});

it('saves measured zoom and still accepts legacy questions without it', () => {
  const [question] = buildQuestions(
    catalog,
    {
      ...defaultGameSettings,
      difficulty: undefined,
      questionTypes: ['pixel-peek'],
    },
    createSeededRandom('measured-peek'),
    1,
  );
  expect(question?.media.kind).toBe('pixel-peek');
  if (!question || question.media.kind !== 'pixel-peek')
    throw new Error('Missing Pixel Peek question');
  expect(question.media.zoom).toBeGreaterThanOrEqual(3);
  expect(isQuestionData(JSON.parse(JSON.stringify(question)))).toBe(true);
  const legacyMedia = { ...question.media };
  delete legacyMedia.zoom;
  expect(isQuestionData({ ...question, media: legacyMedia })).toBe(true);
  for (const zoom of [0, -1, Infinity, NaN, '3']) {
    expect(
      isQuestionData({ ...question, media: { ...question.media, zoom } }),
    ).toBe(false);
  }
});

it('selects only precomputed focus points without changing the approved zoom', () => {
  const pokemon = catalog.pokemon.pikachu!;
  const mask = '100000000000000000001';
  const points = getPixelPeekFocusPoints(pokemon.spriteMeasurements!, mask);
  expect(points).toHaveLength(2);
  const first = getPixelPeekCrop(pokemon.spriteMeasurements, () => 0, mask);
  const last = getPixelPeekCrop(pokemon.spriteMeasurements, () => 0.99, mask);
  expect([first.focusX, first.focusY]).toEqual(points[0]);
  expect([last.focusX, last.focusY]).toEqual(points[1]);
  expect(first.zoom).toBeCloseTo(
    getPixelPeekCrop(pokemon.spriteMeasurements, () => 0).zoom!,
  );
});
