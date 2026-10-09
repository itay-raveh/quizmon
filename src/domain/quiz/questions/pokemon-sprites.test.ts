import { choosePokemonSprite } from './assembly.ts';
import { createSeededRandom } from '../../../lib/random.ts';

const pokemon = {
  sprite: '/current-front.png',
  shinySprite: '/shiny-front.png',
  identitySprites: {
    generations: [
      { generation: 'I', front: ['/old-front.png'], back: ['/old-back.png'] },
      {
        generation: 'IX',
        front: ['/current-front.png'],
        back: ['/current-back.png'],
      },
    ],
  },
} satisfies Parameters<typeof choosePokemonSprite>[0];

it('samples era and orientation independently, including current backs and historical fronts', () => {
  const policy = {
    reveal: 'always',
    silhouette: false,
    historicalSpriteChance: 0.5,
    backSpriteChance: 0.5,
  } as const;
  for (const [rolls, expected] of [
    [[0.2, 0.2], '/old-back.png'],
    [[0.2, 0.8], '/old-front.png'],
    [[0.8, 0.2], '/current-back.png'],
    [[0.8, 0.8], '/current-front.png'],
  ] as const) {
    let index = 0;
    expect(
      choosePokemonSprite(pokemon, policy, () => rolls[index++] ?? 0),
    ).toBe(expected);
  }
  expect(
    choosePokemonSprite(pokemon, policy, createSeededRandom('sprite')),
  ).toBe(choosePokemonSprite(pokemon, policy, createSeededRandom('sprite')));
});

it('falls back to available front art without substituting an unavailable era or color', () => {
  const policy = {
    reveal: 'always',
    silhouette: true,
    historicalSpriteChance: 1,
    backSpriteChance: 1,
  } as const;
  expect(
    choosePokemonSprite(
      {
        ...pokemon,
        identitySprites: {
          generations: [
            { generation: 'I', front: ['/old-front.png'], back: [] },
          ],
        },
      },
      policy,
      () => 0,
    ),
  ).toBe('/old-front.png');
  expect(
    choosePokemonSprite(
      { ...pokemon, identitySprites: { generations: [] } },
      policy,
      () => 0,
    ),
  ).toBe(pokemon.sprite);
  expect(
    choosePokemonSprite(pokemon, policy, () => 0, pokemon.shinySprite),
  ).toBe(pokemon.shinySprite);
  expect(
    choosePokemonSprite(
      { ...pokemon, sprite: null, identitySprites: { generations: [] } },
      policy,
      () => 0,
    ),
  ).toBeNull();
  expect(
    choosePokemonSprite(
      pokemon,
      { reveal: 'always', silhouette: false },
      () => 0,
    ),
  ).toBe(pokemon.sprite);
});

it('excludes opaque early-game canvases only when concealment would erase the entire image', () => {
  const opaque = '/sprites/pokemon/versions/generation-i/red-blue/back/1.png';
  const usable = '/sprites/pokemon/versions/generation-iii/emerald/1.png';
  const source = {
    ...pokemon,
    identitySprites: {
      generations: [
        { generation: 'I' as const, front: [opaque], back: [opaque] },
        { generation: 'III' as const, front: [usable], back: [] },
      ],
    },
  };
  const policy = {
    reveal: 'always' as const,
    silhouette: false,
    historicalSpriteChance: 1,
    backSpriteChance: 1,
  };
  expect(choosePokemonSprite(source, policy, () => 0)).toBe(opaque);
  expect(
    choosePokemonSprite(source, { ...policy, silhouette: true }, () => 0),
  ).toBe(usable);
  expect(
    choosePokemonSprite(
      {
        ...source,
        identitySprites: {
          generations: source.identitySprites.generations.slice(0, 1),
        },
      },
      { ...policy, silhouette: true },
      () => 0,
    ),
  ).toBe(pokemon.sprite);
});
