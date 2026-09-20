import { readSyncConnection } from './connection.ts';

const connection = {
  version: 1,
  endpoint: 'https://sync.example.test',
  audience: 'quizmon-test',
};

it('reads runtime connection information without a built-in deployment address', () => {
  expect(readSyncConnection(connection).endpoint).toBe(
    'https://sync.example.test',
  );
  expect(
    readSyncConnection({
      ...connection,
      endpoint: 'https://other.example.test/sync',
    }).endpoint,
  ).toBe('https://other.example.test/sync');
  expect(
    readSyncConnection({ ...connection, endpoint: 'http://127.0.0.1:8089' })
      .endpoint,
  ).toBe('http://127.0.0.1:8089');
});

it.each([
  undefined,
  { ...connection, version: 2 },
  { ...connection, audience: '' },
  { ...connection, audience: 1 },
  { ...connection, endpoint: 'http://sync.example.test' },
  { ...connection, endpoint: 'https://secret@sync.example.test' },
  { ...connection, endpoint: 'https://sync.example.test?token=secret' },
  { ...connection, endpoint: 'https://sync.example.test#fragment' },
  { ...connection, endpoint: 'javascript:alert(1)' },
])('rejects invalid or unsafe runtime sync configuration', (value) => {
  expect(() => readSyncConnection(value)).toThrow();
});
