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
