import { parseVersionedSave } from './save-schema';
import { isRecord } from '../../lib/validation';
import { parsePlayerSave, SAVE_SCHEMA_VERSION } from './player-save';
import fixture from '../../../tests/fixtures/player-save.v7.json';

const schema = {
  currentVersion: SAVE_SCHEMA_VERSION,
  parseCurrent(value: unknown) {
    if (!isRecord(value) || typeof value.name !== 'string')
      throw new Error('name');
    return { name: value.name };
  },
};

it('keeps the post-reset version 7 save readable without mutating its input', () => {
  const original = {
    ...fixture,
    data: { ...fixture.data, pokedex: ['pikachu'] },
  };
  const saved = parsePlayerSave(original);
  expect(fixture.version).toBe(7);
  expect(saved.version).toBe(SAVE_SCHEMA_VERSION);
  expect(saved.data.pokedex).toContain('pikachu');
  expect(original.data.pokedex).toEqual(['pikachu']);
  saved.data.pokedex.push('eevee');
  expect(original.data.pokedex).toEqual(['pikachu']);
});
it.each([1, 2, 3, 4, 5, 6])(
  'rejects pre-reset schema %i without an upgrade path',
  (version) => {
    const old = { ...fixture, version };
    const raw = JSON.stringify(old);
    expect(() => parsePlayerSave(old)).toThrow(
      expect.objectContaining({ kind: 'unsupported' }),
    );
    expect(JSON.stringify(old)).toBe(raw);
  },
);
it.each([
  [SAVE_SCHEMA_VERSION + 1, 'newer'],
  ['7', 'invalid'],
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
it('upgrades supported versions one step at a time', () => {
  const old = { version: 7, data: { name: 'Leaf' } };
  const next = parseVersionedSave(old, {
    currentVersion: 9,
    migrations: {
      7: (data) => ({ ...(data as object), partner: 'pikachu' }),
      8: (data) => ({ ...(data as object), wins: 0 }),
    },
    parseCurrent: (data) => data,
  });
  expect(next).toEqual({
    version: 9,
    data: { name: 'Leaf', partner: 'pikachu', wins: 0 },
  });
  expect(old).toEqual({ version: 7, data: { name: 'Leaf' } });
  expect(() =>
    parseVersionedSave(old, {
      currentVersion: 9,
      migrations: { 8: (data) => data },
      parseCurrent: (data) => data,
    }),
  ).toThrow(expect.objectContaining({ kind: 'unsupported' }));
});
