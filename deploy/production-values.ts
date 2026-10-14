import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseAllDocuments } from 'yaml';
import { isRecord } from '../src/lib/validation.ts';

export async function readProductionValues(infra: string) {
  const releaseDirectory = join(infra, 'clusters/shire/apps/quizmon/release');
  const readDocuments = async (path: string) => {
    const documents = parseAllDocuments(await readFile(path, 'utf8'));
    const error = documents.flatMap((document) => document.errors)[0];
    if (error) throw error;
    return documents.map((document): unknown => {
      const value: unknown = document.toJSON();
      return value;
    });
  };
  const releases = await readDocuments(
    join(releaseDirectory, 'app-chart.yaml'),
  );
  const release = releases.find(
    (resource) => isRecord(resource) && resource.kind === 'HelmRelease',
  );
  const spec = isRecord(release) ? release.spec : undefined;
  if (!isRecord(spec) || !isRecord(spec.values))
    throw new Error('Production Helm values are missing.');

  const inputs = await readDocuments(
    join(releaseDirectory, 'inputs/runtime.yaml'),
  );
  let values: Record<string, unknown> = {};
  if (!Array.isArray(spec.valuesFrom))
    throw new Error('Production valuesFrom is missing.');
  for (const reference of spec.valuesFrom) {
    if (
      !isRecord(reference) ||
      reference.kind !== 'ConfigMap' ||
      reference.name !== 'quizmon-runtime' ||
      reference.valuesKey !== 'values.yaml' ||
      Object.keys(reference).some(
        (key) => !['kind', 'name', 'valuesKey'].includes(key),
      )
    )
      throw new Error('Unsupported production valuesFrom reference.');
    const resource = inputs.find(
      (input) =>
        isRecord(input) &&
        input.kind === 'ConfigMap' &&
        isRecord(input.metadata) &&
        input.metadata.name === reference.name,
    );
    const data = isRecord(resource) ? resource.data : undefined;
    const yaml = isRecord(data) ? data[reference.valuesKey] : undefined;
    if (typeof yaml !== 'string')
      throw new Error('Production ConfigMap values are missing.');
    const documents = parseAllDocuments(yaml);
    if (documents.length !== 1 || documents[0]?.errors.length)
      throw new Error('Invalid production ConfigMap values.');
    const input: unknown = documents[0]?.toJSON();
    if (!isRecord(input) || 'releaseImage' in input)
      throw new Error(
        'Production ConfigMap cannot override the release image.',
      );
    values = mergeValues(values, input);
  }

  const inline = { ...spec.values };
  if ('releaseImage' in inline) {
    // Accept only the legacy image pin while infra transitions to OCI charts.
    const image = inline.releaseImage;
    const chart = isRecord(spec.chart) ? spec.chart.spec : undefined;
    const source = isRecord(chart) ? chart.sourceRef : undefined;
    if (
      !isRecord(source) ||
      source.kind !== 'GitRepository' ||
      !isRecord(image) ||
      image.repository !== 'ghcr.io/itay-raveh/quizmon' ||
      typeof image.digest !== 'string' ||
      !/^sha256:[a-f0-9]{64}$/.test(image.digest) ||
      Object.keys(image).some((key) => !['repository', 'digest'].includes(key))
    )
      throw new Error('Unexpected production release image override.');
    delete inline.releaseImage;
  }
  return mergeValues(values, inline);
}

function mergeValues(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key))
      throw new Error('Invalid production values key.');
    const previous = result[key];
    result[key] = isRecord(value)
      ? mergeValues(isRecord(previous) ? previous : {}, value)
      : value;
  }
  return result;
}
