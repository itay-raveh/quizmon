import { readEditorialCatalogFiles } from './catalog-output.ts';
import { addShowdownBattleData } from './showdown-battle.ts';

it('uses Showdown battle facts and records disagreements without fallback', async () => {
  const catalog = await readEditorialCatalogFiles(
    new URL('../src/domain/pokemon/data/', import.meta.url),
  );
  const pikachu = catalog.pokemon.pikachu!;
  pikachu.stats.attack = 1;
  pikachu.abilities = ['blaze'];
  delete catalog.topics.gaps.showdownAbilityConflicts;
  catalog.typeRelations = {};

  await addShowdownBattleData(catalog);

  expect(pikachu.stats.attack).toBe(55);
  expect(pikachu.abilities).toEqual([]);
  expect(pikachu.abilitySlots).toBeUndefined();
  expect(catalog.topics.gaps.showdownAbilityConflicts).toContain('pikachu');
  expect(catalog.typeRelations.fire!.doubleTo).toContain('grass');
  expect(
    catalog.topics.natures.find((nature) => nature.name === 'adamant'),
  ).toMatchObject({ raised: 'attack', lowered: 'special-attack' });
  expect(catalog.pokemon['basculegion-male']!.stats.attack).toBe(112);
});
