import { catalog, createQuestionContext } from './fixtures/catalog';
import { buildQuestionType } from '@/game/questions/registry';
import { formatPokemonName } from '@/game/format';
import { isSpritePath } from '@/game/sprite-source';
import { registerPokedexAnswer } from '@/game/pokedex';
import { readPlayerData } from '@/game/player-storage';
import { createSeededRandom } from '@/game/random';

it('ships distinct identities for the curated forms and retains every species', () => {
  const entries = Object.values(catalog.pokemon);
  expect(entries).toHaveLength(1236);
  expect(new Set(entries.map((entry) => entry.formId)).size).toBe(
    entries.length,
  );
  expect(new Set(entries.map((entry) => entry.speciesId)).size).toBe(1025);
  expect(new Set(entries.map((entry) => entry.displayName)).size).toBe(
    entries.length,
  );
  for (const [name, pokemon] of Object.entries(catalog.pokemon)) {
    expect(pokemon.sprite, name).toBeTruthy();
    expect(formatPokemonName(name)).toBe(pokemon.displayName);
    for (const type of pokemon.types)
      expect(
        Object.hasOwn(catalog.typeRelations, type),
        `${name}: ${type}`,
      ).toBe(true);
    for (const path of [
      pokemon.sprite,
      pokemon.shinySprite,
      ...pokemon.identitySprites.generations.flatMap(({ front, back }) => [
        ...front,
        ...back,
      ]),
    ]) {
      if (path) expect(isSpritePath(path), `${name}: ${path}`).toBe(true);
    }
  }
});

it('can ask a valid named question about every retained form', () => {
  for (const [name, pokemon] of Object.entries(catalog.pokemon)) {
    const question = buildQuestionType(
      {
        catalog,
        pool: [{ name, pokemon }],
        random: createSeededRandom(name),
        used: new Set(),
      },
      'type-check',
    );
    expect(question?.pokemonName, name).toBe(name);
    expect(question?.options, name).toHaveLength(4);
    expect(
      question?.options.filter((option) => pokemon.types.includes(option)),
      name,
    ).toEqual(question?.answer.correctOptions);
    expect(question?.prompt).toMatchObject({
      kind: 'pokemon',
      name,
      dexNumber: pokemon.speciesId,
    });
  }
});

it.each([
  ['raichu-alola', 26, 'VII', 'I', ['electric', 'psychic']],
  ['typhlosion-hisui', 157, 'VIII', 'II', ['fire', 'ghost']],
  ['tauros-paldea-aqua-breed', 128, 'IX', 'I', ['fighting', 'water']],
  ['unown', 201, 'II', 'II', ['psychic']],
  ['charizard-mega-x', 6, 'VI', 'I', ['fire', 'dragon']],
])(
  'keeps %s form facts separate from its species',
  (name, speciesId, generation, speciesGeneration, types) => {
    expect(catalog.pokemon[name]).toMatchObject({
      speciesId,
      generation,
      speciesGeneration,
      types,
    });
  },
);

it('preserves regional breed names and gives collapsed entries their shared name', () => {
  for (const [name, label] of [
    ['tauros-paldea-aqua-breed', 'Paldean Tauros (Aqua Breed)'],
    ['raichu-alola', 'Alolan Raichu'],
    ['unown', 'Unown'],
    ['alcremie', 'Alcremie'],
    ['minior-red-meteor', 'Minior'],
    ['aegislash-shield', 'Aegislash'],
    ['zygarde-50', 'Zygarde'],
    ['pumpkaboo-average', 'Pumpkaboo'],
    ['darmanitan-galar-standard', 'Galarian Darmanitan'],
    ['meowstic-male-mega', 'Mega Meowstic'],
  ] as const) {
    expect(formatPokemonName(name), name).toBe(label);
  }
});

it('uses form-specific evolutions and retains a shared family across regional branches', () => {
  expect(catalog.pokemon['meowth-galar']?.evolvesTo).toEqual(['perrserker']);
  expect(catalog.pokemon.meowth?.evolvesTo).toEqual(['persian']);
  expect(catalog.pokemon.pikachu?.evolvesTo).toContain('raichu-alola');
  expect(catalog.pokemon.perrserker?.evolutionFamily).toBe(
    catalog.pokemon.persian?.evolutionFamily,
  );
});

it('does not give the original Typhlosion its Hisuian description or invent missing notes', () => {
  expect(catalog.pokemon.typhlosion?.description).not.toMatch(/souls|spirit/i);
  expect(catalog.pokemon.typhlosion?.description).not.toBe('');
  expect(catalog.pokemon['typhlosion-hisui']?.description).toBe('');
  expect(catalog.pokemon.unown?.hasDistinctDescription).toBe(true);
  expect(catalog.pokemon['raichu-alola']?.hasDistinctDescription).toBe(true);
});

it.each([
  ['alcremie', 2],
  ['unown', 1],
  ['vivillon', 1],
  ['scatterbug', 1],
  ['spewpa', 1],
  ['furfrou', 1],
  ['deerling', 1],
  ['sawsbuck', 1],
  ['shellos', 1],
  ['gastrodon', 1],
  ['flabebe', 1],
  ['florges', 1],
  ['floette', 2],
  ['minior', 1],
  ['mothim', 1],
  ['frillish', 1],
  ['jellicent', 1],
  ['pyroar', 2],
  ['xerneas', 1],
  ['koraidon', 1],
  ['miraidon', 1],
  ['pikachu', 2],
  ['pichu', 1],
  ['magearna', 2],
  ['zarude', 1],
  ['maushold', 1],
  ['dudunsparce', 1],
  ['sinistea', 1],
  ['polteageist', 1],
  ['poltchageist', 1],
  ['sinistcha', 1],
  ['keldeo', 1],
  ['cramorant', 1],
  ['aegislash', 1],
  ['zygarde', 1],
  ['pumpkaboo', 1],
  ['gourgeist', 1],
  ['arceus', 1],
  ['silvally', 1],
  ['rotom', 6],
  ['lycanroc', 3],
  ['urshifu', 4],
  ['meowstic', 2],
  ['tatsugiri', 2],
  ['toxtricity', 2],
  ['darmanitan', 2],
] as const)('keeps %s to its approved %i entries', (species, count) => {
  expect(
    Object.values(catalog.pokemon).filter(
      (pokemon) => pokemon.speciesName === species,
    ),
  ).toHaveLength(count);
});

it('excludes unapproved alternate forms', () => {
  for (const name of [
    'pikachu-alola-cap',
    'pikachu-cosplay',
    'pichu-spiky-eared',
    'magearna-original',
    'magearna-original-mega',
    'zarude-dada',
    'maushold-family-of-three',
    'dudunsparce-three-segment',
    'sinistea-antique',
    'polteageist-antique',
    'poltchageist-artisan',
    'sinistcha-masterpiece',
    'keldeo-resolute',
    'arceus-unknown',
    'cramorant-gulping',
    'cramorant-gorging',
    'aegislash-blade',
    'zygarde-10',
    'zygarde-complete',
    'zygarde-50-power-construct',
    'pumpkaboo-large',
    'pumpkaboo-small',
    'gourgeist-super',
    'arceus-fire',
    'silvally-fire',
    'floette-eternal',
    'pikachu-starter',
    'burmy-sandy',
    'wormadam-sandy',
    'meowstic-female',
    'indeedee-female',
    'basculegion-female',
    'oinkologne-female',
    'tatsugiri-droopy',
    'minior-red',
    'darmanitan-galar-zen',
    'tatsugiri-droopy-mega',
    'meowstic-female-mega',
    'toxtricity-low-key-gmax',
  ])
    expect(catalog.pokemon[name], name).toBeUndefined();
  expect(
    Object.keys(catalog.pokemon).filter((name) => name.includes('-totem')),
  ).toEqual([]);
  expect(catalog.pokemon.sinistea?.evolvesTo).toEqual(['polteageist']);
  expect(catalog.pokemon.poltchageist?.evolvesTo).toEqual(['sinistcha']);
});

it('retains the approved transformations and explicit exceptions', () => {
  for (const name of [
    'floette-mega',
    'alcremie-gmax',
    'rotom-heat',
    'rotom-wash',
    'rotom-frost',
    'rotom-fan',
    'rotom-mow',
    'groudon-primal',
    'kyogre-primal',
    'dialga-origin',
    'palkia-origin',
    'giratina-origin',
    'kyurem-black',
    'kyurem-white',
    'necrozma-dusk',
    'necrozma-dawn',
    'necrozma-ultra',
    'calyrex-ice',
    'calyrex-shadow',
    'hoopa-unbound',
    'shaymin-sky',
    'tornadus-therian',
    'thundurus-therian',
    'landorus-therian',
    'enamorus-therian',
    'deoxys-attack',
    'deoxys-defense',
    'deoxys-speed',
    'lycanroc-midday',
    'lycanroc-midnight',
    'lycanroc-dusk',
    'urshifu-single-strike',
    'urshifu-rapid-strike',
  ])
    expect(catalog.pokemon[name], name).toBeDefined();
});

it('avoids ambiguous same-species picture and description answers', () => {
  for (const type of [
    'pokedex-scan',
    'whos-that-pokemon',
    'silhouette-match',
    'sprite-match',
    'pixel-peek',
    'field-notes',
  ] as const) {
    const context = createQuestionContext(type);
    context.used = new Set(
      context.pool
        .filter(({ name }) => name !== 'raichu-alola')
        .map(({ name }) => name),
    );
    const question = buildQuestionType(context, type)!;
    expect(question.pokemonName).toBe('raichu-alola');
    expect(question.options).toHaveLength(4);
    expect(
      question.options.filter(
        (name) => catalog.pokemon[name]?.speciesId === 26,
      ),
    ).toEqual(['raichu-alola']);
  }
});

it('keeps Champion targets and search choices limited to distinguishable descriptions', () => {
  const question = buildQuestionType(
    createQuestionContext('form-champion'),
    'champion',
  )!;
  expect(catalog.pokemon[question.pokemonName]?.hasDistinctDescription).toBe(
    true,
  );
  expect(
    question.searchOptions?.some(({ name }) => name === question.pokemonName),
  ).toBe(true);
  expect(
    question.searchOptions?.every(
      ({ name }) => catalog.pokemon[name]?.hasDistinctDescription,
    ),
  ).toBe(true);
});

it('credits two forms of one species as two discoveries', () => {
  localStorage.clear();
  for (const name of ['raichu', 'raichu-alola']) {
    const pokemon = catalog.pokemon[name]!;
    const question = buildQuestionType(
      {
        catalog,
        pool: [{ name, pokemon }],
        random: createSeededRandom(name),
        used: new Set(),
      },
      'type-check',
    )!;
    expect(registerPokedexAnswer(question, true)).toBe(true);
  }
  expect(readPlayerData().pokedex.toSorted()).toEqual([
    'raichu',
    'raichu-alola',
  ]);
});

it('rejects an odd-one-out puzzle where either Fire or Flying gives a different answer', () => {
  for (let seed = 0; seed < 10; seed += 1) {
    const context = createQuestionContext(`ambiguous-types-${seed}`);
    context.pool = [
      'charizard',
      'charizard-mega-x',
      'charizard-mega-y',
      'salamence',
    ].map((name) => ({ name, pokemon: catalog.pokemon[name]! }));
    expect(buildQuestionType(context, 'odd-one-out')).toBeUndefined();
  }
});

it('rejects an odd-one-out puzzle with repeated species even when its answer is unambiguous', () => {
  const context = createQuestionContext('unambiguous-types');
  context.pool = [
    'charizard',
    'charizard-mega-x',
    'charizard-mega-y',
    'squirtle',
  ].map((name) => ({ name, pokemon: catalog.pokemon[name]! }));
  expect(buildQuestionType(context, 'odd-one-out')).toBeUndefined();
});

it('offers only the requested Deoxys forme when a Champion description could also describe its species', () => {
  const context = createQuestionContext('deoxys-champion');
  context.used = new Set(
    context.pool
      .filter(({ name }) => name !== 'deoxys-normal')
      .map(({ name }) => name),
  );
  const question = buildQuestionType(context, 'champion')!;
  expect(question.pokemonName).toBe('deoxys-normal');
  expect(
    question.searchOptions
      ?.filter(({ name }) => catalog.pokemon[name]!.speciesName === 'deoxys')
      .map(({ name }) => name),
  ).toEqual(['deoxys-normal']);
});
