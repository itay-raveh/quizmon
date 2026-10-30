import type { EvolutionDetail } from 'pokenode-ts';
import { evolutionMethodConditions } from './catalog-evolutions.ts';

const detail = (changes: Partial<EvolutionDetail>): EvolutionDetail => ({
  item: null,
  held_item: null,
  min_level: null,
  min_happiness: null,
  min_beauty: null,
  min_affection: null,
  known_move: null,
  known_move_type: null,
  used_move: null,
  min_move_count: null,
  min_steps: null,
  min_damage_taken: null,
  location: null,
  region: null,
  time_of_day: '',
  gender: null,
  relative_physical_stats: null,
  party_species: null,
  party_type: null,
  trade_species: null,
  required_pokemon_form: null,
  evolved_pokemon_form: null,
  allowed_natures: null,
  condition_expression: null,
  needs_overworld_rain: false,
  turn_upside_down: false,
  near_special_rock: false,
  needs_multiplayer: false,
  trigger: { name: 'level-up', url: '' },
  version_group: { name: 'fixture', url: '' },
  is_default: true,
  ...changes,
});
const ordinary = { pokemonId: 1, speciesId: 1 };
const regional = { pokemonId: 10001, speciesId: 1 };
const region = { name: 'hisui', url: '' };

it('separates a game-implied region from an ordinary evolution requirement', () => {
  const method = evolutionMethodConditions(
    detail({ min_level: 17, region }),
    ordinary,
    ordinary,
    ['hisui'],
  );
  expect(method).toEqual({
    conditions: [{ kind: 'min-level', text: 'at level 17' }],
    context: { region: 'hisui' },
  });
});

it('preserves form-changing and selectable-region requirements', () => {
  for (const [after, regions] of [
    [regional, ['hisui']],
    [ordinary, ['hisui', 'johto']],
  ] as const) {
    const method = evolutionMethodConditions(
      detail({ region }),
      ordinary,
      after,
      regions,
    );
    expect(method.context).toBeUndefined();
    expect(method.conditions).toEqual([
      { kind: 'region', region: 'hisui', text: 'in hisui' },
    ]);
  }
});

it('keeps specific locations, time, and multiplayer typed independently', () => {
  const method = evolutionMethodConditions(
    detail({
      region,
      location: { name: 'charged-cave', url: '' },
      needs_multiplayer: true,
      time_of_day: 'night',
    }),
    ordinary,
    ordinary,
    ['hisui'],
  );
  expect(method.conditions).toEqual([
    { kind: 'location', text: 'at charged cave' },
    { kind: 'time-of-day', time: 'night', text: 'during the night' },
    { kind: 'needs-multiplayer', text: 'in multiplayer' },
  ]);
});
