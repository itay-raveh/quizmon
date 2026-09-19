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

it('loads the current save without mutating its input', () => {
  const original = structuredClone(fixture);
  const saved = parsePlayerSave(original);
  expect(saved).toEqual(fixture);
  expect(original).toEqual(fixture);
  saved.data.pokedex.push('pikachu');
  expect(original.data.pokedex).toEqual([]);
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
