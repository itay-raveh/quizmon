import type { SpriteMeasurements } from '@/domain/pokemon/types';
import { describe, expect, it } from 'vitest';
import { arrangeGroup } from './hall-portrait';

const lineup = (count: number) => {
  const pokemon = Array.from({ length: count }, (_, index) => String(index));
  const sizes = new Map<string, SpriteMeasurements>(
    pokemon.map((name, index) => {
      const width = 0.9 - index * 0.015;
      return [
        name,
        { area: width ** 2, width, height: width, centerX: 0.5, bottom: 0.9 },
      ];
    }),
  );
  return arrangeGroup(pokemon, sizes);
};

describe('Hall of Fame portrait layering', () => {
  it('draws every smaller sprite above larger sprites, including across the curve', () => {
    const portrait = lineup(43);
    const bySize = portrait.toSorted((a, b) => Number(a.name) - Number(b.name));
    for (let index = 1; index < bySize.length; index++) {
      expect(bySize[index]!.layer).toBeGreaterThan(bySize[index - 1]!.layer);
    }
  });

  it('keeps both outer Pokémon behind their neighbors nearer the center', () => {
    const row = lineup(5);
    expect(row[0]!.layer).toBeLessThan(row[1]!.layer);
    expect(row[4]!.layer).toBeLessThan(row[3]!.layer);
    expect(row[2]!.layer).toBeGreaterThan(row[1]!.layer);
    expect(row[2]!.layer).toBeGreaterThan(row[3]!.layer);
  });

  it('keeps the front row above the back row', () => {
    const portrait = lineup(20);
    const back = portrait.slice(0, 10);
    const front = portrait.slice(10);
    expect(Math.min(...front.map(({ layer }) => layer))).toBeGreaterThan(
      Math.max(...back.map(({ layer }) => layer)),
    );
  });
});
