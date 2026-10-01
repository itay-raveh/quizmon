import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterNodeDatabaseSpan } from '../../server/sentry-spans.ts';
import { filterWorkerDatabaseSpan } from '../../worker/sentry-spans.ts';

void test('database spans remove connection details and retain SDK query summaries', () => {
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
    name: 'SELECT * FROM users WHERE email = ?',
    attributes: {
      'db.system.name': 'postgresql',
      'db.namespace': 'quizmon',
      'db.query.summary': 'SELECT users',
      'db.query.text': 'SELECT * FROM users WHERE email = ?',
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
    'db.query.text': 'SELECT * FROM users WHERE email = ?',
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
