import { isRecord } from '../../lib/validation';
import type { TopicCatalog } from './topic-catalog';

const arrayKeys = [
  'items',
  'moves',
  'abilities',
  'natures',
  'berries',
  'regions',
  'locations',
  'evolutions',
  'encounters',
  'medicines',
  'effects',
] as const;
const objectKeys = ['games', 'gaps'] as const;
export const assembleTopicCatalog = (
  chunks: unknown[],
  contentVersion: number,
): TopicCatalog => {
  const result: Record<string, unknown> = {};
  for (const chunk of chunks) {
    if (
      !isRecord(chunk) ||
      chunk.contentVersion !== contentVersion ||
      typeof chunk.key !== 'string'
    )
      throw new Error('The topic catalog has an invalid version.');
    if (
      arrayKeys.some((key) => key === chunk.key) &&
      Array.isArray(chunk.values)
    ) {
      if (!chunk.values.every(isRecord))
        throw new Error('The topic catalog contains an invalid record.');
      result[chunk.key] = [
        ...((result[chunk.key] as unknown[]) ?? []),
        ...chunk.values,
      ];
    } else if (
      objectKeys.some((key) => key === chunk.key) &&
      isRecord(chunk.values) &&
      result[chunk.key] === undefined
    )
      result[chunk.key] = chunk.values;
    else throw new Error('The topic catalog has an invalid structure.');
  }
  if ([...arrayKeys, ...objectKeys].some((key) => result[key] === undefined))
    throw new Error('The topic catalog is incomplete.');
  return result as unknown as TopicCatalog;
};
