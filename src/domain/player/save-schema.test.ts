import { parseVersionedSave } from './save-schema';
import { isRecord } from '../../lib/validation';
import { parsePlayerSave } from './player-save';
import fixture from '../../../tests/fixtures/player-save.v6.json';
import currentFixture from '../../../tests/fixtures/player-save.v7.json';

const parseNamed = (value: unknown) => {
  if (!isRecord(value) || typeof value.name !== 'string')
    throw new Error('name');
  return { name: value.name };
};
const parseCurrent = (value: unknown) => {
  if (
    !isRecord(value) ||
    typeof value.label !== 'string' ||
    typeof value.enabled !== 'boolean'
  )
    throw new Error('current');
  return { label: value.label, enabled: value.enabled };
};
const schema = {
  minimumVersion: 6,
  currentVersion: 8,
  parseCurrent,
  migrations: {
    6: {
      parse: parseNamed,
      upgrade: (data: unknown) => ({ label: parseNamed(data).name }),
    },
    7: {
      parse: (data: unknown) => {
        if (!isRecord(data) || typeof data.label !== 'string')
          throw new Error('label');
        return data;
      },
      upgrade: (data: unknown) => ({ ...(data as object), enabled: true }),
    },
  },
};
it('migrates the frozen version 6 fixture into the shared schema', () => {
  const before = structuredClone(fixture);
  expect(parsePlayerSave(fixture)).toEqual(currentFixture);
  expect(fixture).toEqual(before);
});
it('loads the frozen current schema without changing it', () => {
  expect(parsePlayerSave(currentFixture)).toEqual(currentFixture);
});
it('runs every intermediate migration in order and leaves the original untouched', () => {
  const original = { version: 6, data: { name: 'Leaf' } };
  expect(parseVersionedSave(original, schema)).toEqual({
    version: 8,
    data: { label: 'Leaf', enabled: true },
  });
  expect(original).toEqual({ version: 6, data: { name: 'Leaf' } });
});
it('loads current data without invoking migration functions', () => {
  const upgrade = vi.fn();
  const data = { label: 'Leaf', enabled: false };
  expect(
    parseVersionedSave(
      { version: 8, data },
      { ...schema, migrations: { 6: { parse: parseNamed, upgrade } } },
    ).data,
  ).toEqual(data);
  expect(upgrade).not.toHaveBeenCalled();
});
it.each([
  [5, 'unsupported'],
  [9, 'newer'],
  ['6', 'invalid'],
  [1.5, 'invalid'],
])('classifies version %s as %s', (version, kind) => {
  expect(() => parseVersionedSave({ version, data: {} }, schema)).toThrow(
    expect.objectContaining({ kind }),
  );
});
it('rejects a missing step and validates both the source and final schema', () => {
  expect(() =>
    parseVersionedSave(
      { version: 6, data: { name: 'Leaf' } },
      { ...schema, migrations: {} },
    ),
  ).toThrow(expect.objectContaining({ kind: 'unsupported' }));
  expect(() =>
    parseVersionedSave({ version: 6, data: { name: 1 } }, schema),
  ).toThrow(expect.objectContaining({ kind: 'invalid' }));
  expect(() =>
    parseVersionedSave(
      { version: 7, data: { label: 'Leaf' } },
      {
        ...schema,
        migrations: {
          7: { parse: (data) => data, upgrade: () => ({ label: 'Leaf' }) },
        },
      },
    ),
  ).toThrow(expect.objectContaining({ kind: 'invalid' }));
});
