import { parseVersionedSave } from './save-schema';
import { isRecord } from '../../lib/validation';
import { parsePlayerSave, SAVE_SCHEMA_VERSION } from './player-save';
import fixture from '../../../tests/fixtures/player-save.v1.json';

const schema = {
  currentVersion: SAVE_SCHEMA_VERSION,
  parseCurrent(value: unknown) {
    if (!isRecord(value) || typeof value.name !== 'string')
      throw new Error('name');
    return { name: value.name };
  },
};

it('keeps the baseline save readable without mutating its input', () => {
  const original = {
    ...fixture,
    data: { ...fixture.data, pokedex: ['pikachu'] },
  };
  const saved = parsePlayerSave(original);
  expect(fixture.version).toBe(1);
  expect(saved.version).toBe(SAVE_SCHEMA_VERSION);
  expect(saved.data.pokedex).toContain('pikachu');
  expect(original.data.pokedex).toEqual(['pikachu']);
  saved.data.pokedex.push('eevee');
  expect(original.data.pokedex).toEqual(['pikachu']);
});
it.each([
  [SAVE_SCHEMA_VERSION + 1, 'newer'],
  ['1', 'invalid'],
  [1.5, 'invalid'],
  [0, 'invalid'],
])('classifies version %s as %s', (version, kind) => {
  expect(() => parseVersionedSave({ version, data: {} }, schema)).toThrow(
    expect.objectContaining({ kind }),
  );
});
it('validates current data and returns a separate value', () => {
  const value = { version: SAVE_SCHEMA_VERSION, data: { name: 'Leaf' } };
  expect(parseVersionedSave(value, schema)).toEqual(value);
  expect(() =>
    parseVersionedSave({ ...value, data: { name: 1 } }, schema),
  ).toThrow(expect.objectContaining({ kind: 'invalid' }));
});

it('rejects an older format until an explicit upgrade is added', () => {
  expect(() =>
    parseVersionedSave(
      { version: 1, data: { name: 'Leaf' } },
      { ...schema, currentVersion: 2 },
    ),
  ).toThrow(expect.objectContaining({ kind: 'invalid' }));
});
