import { readCatalogFiles } from './catalog-output.ts';
import { addShowdownBattleData, showdownSpecies } from './showdown-battle.ts';

it('uses Showdown battle facts and records disagreements without fallback', async () => {
  const catalog = await readCatalogFiles(
    new URL('../src/domain/pokemon/data/', import.meta.url),
  );
  const species = (name: string) =>
    showdownSpecies(name, catalog.pokemon[name]!).name;
  expect(species('maushold-family-of-four')).toBe('Maushold-Four');
  expect(species('meowstic-male-mega')).toBe('Meowstic-M-Mega');
  const pikachu = catalog.pokemon.pikachu!;
  pikachu.stats.attack = 1;
  pikachu.abilities = ['blaze'];
  catalog.typeRelations = {};

  await addShowdownBattleData(catalog);

  expect(pikachu.stats.attack).toBe(55);
  expect(pikachu.abilities).toEqual([]);
  expect(pikachu.abilitySlots).toBeUndefined();
  expect(catalog.typeRelations.fire!.doubleTo).toContain('grass');
  expect(
    catalog.topics!.natures.find((nature) => nature.name === 'adamant'),
  ).toMatchObject({ raised: 'attack', lowered: 'special-attack' });
  expect(catalog.pokemon['basculegion-male']!.stats.attack).toBe(112);
});
