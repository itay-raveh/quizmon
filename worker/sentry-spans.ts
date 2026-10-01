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
  if (typeof summary === 'string') span.name = summary;
  else if (span.name !== 'pg.connect' && span.name !== 'pg-pool.connect')
    span.name = 'PostgreSQL operation';
  for (const key of Object.keys(span.attributes))
    if (!postgresAttributes.has(key)) delete span.attributes[key];
  return span;
}
