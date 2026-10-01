import { sanitizeSqlQuery } from '@sentry/server-utils';

const mongoAttributes = new Set([
  'db.system',
  'db.name',
  'db.operation',
  'db.mongodb.collection',
]);

export function filterNodeDatabaseSpan<
  T extends {
    op?: string;
    description?: string;
    data: Record<string, unknown>;
  },
>(span: T): T {
  if (!span.op?.startsWith('db')) return span;
  const collection = span.data['db.mongodb.collection'];
  const operation = span.data['db.operation'];
  span.description =
    span.data['db.system'] === 'mongodb' &&
    typeof collection === 'string' &&
    typeof operation === 'string'
      ? `mongodb.${operation} ${collection}`
      : 'Database operation';
  for (const key of Object.keys(span.data))
    if (
      (key.startsWith('db.') && !mongoAttributes.has(key)) ||
      key.startsWith('net.peer.') ||
      key.startsWith('server.')
    )
      delete span.data[key];
  return span;
}

const postgresAttributes = new Set([
  'db.system.name',
  'db.namespace',
  'db.query.summary',
  'db.query.text',
  'sentry.op',
  'sentry.origin',
  'sentry.kind',
]);

export function filterWorkerDatabaseSpan<
  T extends { name: string; attributes?: Record<string, unknown> },
>(span: T): T {
  if (span.attributes?.['db.system.name'] !== 'postgresql') return span;
  const summary = span.attributes['db.query.summary'];
  const query = span.attributes['db.query.text'];
  if (typeof summary === 'string') span.name = summary;
  else if (span.name !== 'pg.connect' && span.name !== 'pg-pool.connect')
    span.name = 'PostgreSQL operation';
  if (typeof query === 'string')
    span.attributes['db.query.text'] = sanitizeSqlQuery(query);
  for (const key of Object.keys(span.attributes))
    if (!postgresAttributes.has(key)) delete span.attributes[key];
  return span;
}
