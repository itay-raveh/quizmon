import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  filterNodeDatabaseSpan,
  filterWorkerDatabaseSpan,
} from '../../server/sentry-spans.ts';

void test('database spans retain operations while removing queries and connection details', () => {
  const mongo = filterNodeDatabaseSpan({
    op: 'db',
    description: 'find { email: secret }',
    data: {
      'db.system': 'mongodb',
      'db.name': 'quizmon',
      'db.operation': 'find',
      'db.mongodb.collection': 'players',
      'db.statement': '{ email: secret }',
      'db.connection_string': 'mongodb://private-host',
      'net.peer.name': 'private-host',
    },
  });
  assert.equal(mongo.description, 'mongodb.find players');
  assert.deepEqual(mongo.data, {
    'db.system': 'mongodb',
    'db.name': 'quizmon',
    'db.operation': 'find',
    'db.mongodb.collection': 'players',
  });

  const postgres = filterWorkerDatabaseSpan({
    name: "SELECT * FROM users WHERE email = 'secret'",
    attributes: {
      'db.system.name': 'postgresql',
      'db.namespace': 'quizmon',
      'db.query.summary': 'SELECT users',
      'db.query.text': "SELECT * FROM users WHERE email = 'secret'",
      'db.connection_string': 'postgresql://private-host/quizmon',
      'db.user': 'private-user',
      'server.address': 'private-host',
      'sentry.op': 'db',
    },
  });
  assert.equal(postgres.name, 'SELECT users');
  assert.deepEqual(postgres.attributes, {
    'db.system.name': 'postgresql',
    'db.namespace': 'quizmon',
    'db.query.summary': 'SELECT users',
    'sentry.op': 'db',
  });

  const connect = filterWorkerDatabaseSpan({
    name: 'pg.connect',
    attributes: {
      'db.system.name': 'postgresql',
      'server.address': 'private-host',
    },
  });
  assert.equal(connect.name, 'pg.connect');
  assert.deepEqual(connect.attributes, { 'db.system.name': 'postgresql' });
});
