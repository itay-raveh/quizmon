import type { PokemonCatalog } from '@/domain/pokemon/types';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { TrainerPokedex } from './TrainerPokedex';

test("shows the viewed trainer's discoveries, not local progress", () => {
  const catalog = {
    pokemon: {
      Pikachu: { speciesId: 25, sprite: null, types: ['electric'] },
      Eevee: { speciesId: 133, sprite: null, types: ['normal'] },
    },
  } as unknown as PokemonCatalog;
  const html = renderToStaticMarkup(
    <TrainerPokedex catalog={catalog} foundPokemon={['Eevee']} />,
  );

  expect(html).toContain('1 / 2 found');
  expect(html).toContain('Eevee');
  expect(html).toContain('Not found');
  expect(html).not.toContain('Pikachu');
});
