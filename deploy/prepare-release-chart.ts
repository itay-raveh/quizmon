import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse, parseAllDocuments, stringify } from 'yaml';
import { readProductionValues } from './production-values.ts';
import { isRecord } from '../src/lib/validation.ts';

const [infra, image, version, revision, output] = process.argv.slice(2);
if (
  !infra ||
  !image ||
  !/^ghcr\.io\/itay-raveh\/quizmon@sha256:[a-f0-9]{64}$/.test(image) ||
  !version ||
  !/^0\.[1-9]\d*\.[1-9]\d*$/.test(version) ||
  !revision ||
  !/^[a-f0-9]{40}$/.test(revision) ||
  !output
)
  throw new Error(
    'Usage: prepare-release-chart.ts <infra> <image@digest> <0.run.attempt> <revision> <output>',
  );

const productionValues = await readProductionValues(infra);
const cluster = await readFile(join(infra, 'tofu/locals.tf'), 'utf8');
const versions = [
  ...cluster.matchAll(/^\s*kubernetes_version\s*=\s*"v?(\d+\.\d+\.\d+)"\s*$/gm),
];
assert.equal(
  versions.length,
  1,
  'Production Kubernetes version is missing or ambiguous.',
);
const kubernetesVersion = versions[0]?.[1];
assert(kubernetesVersion);
const chartDirectory = join(output, 'quizmon');
await mkdir(output, { recursive: true });
await cp('charts/quizmon', chartDirectory, { recursive: true });
const chart: unknown = parse(
  await readFile(join(chartDirectory, 'Chart.yaml'), 'utf8'),
);
assert(isRecord(chart), 'Chart metadata is missing.');
chart.version = version;
chart.appVersion = revision;
await writeFile(join(chartDirectory, 'Chart.yaml'), stringify(chart));
const defaults: unknown = parse(
  await readFile(join(chartDirectory, 'values.yaml'), 'utf8'),
);
assert(isRecord(defaults), 'Chart defaults are missing.');
const [repository, digest] = image.split('@');
defaults.releaseImage = { repository, digest };
await writeFile(join(chartDirectory, 'values.yaml'), stringify(defaults));
const valuesFile = join(output, 'production-values.yaml');
await writeFile(valuesFile, stringify(productionValues));
execFileSync('helm', ['lint', '--strict', chartDirectory, '-f', valuesFile], {
  stdio: 'inherit',
});
const manifest = execFileSync(
  'helm',
  [
    'template',
    'online',
    chartDirectory,
    '--namespace',
    'quizmon',
    '--kube-version',
    kubernetesVersion,
    '-f',
    valuesFile,
  ],
  { encoding: 'utf8' },
);
const manifestPath = join(output, 'production-rendered.yaml');
await writeFile(manifestPath, manifest);
execFileSync(
  'kubeconform',
  [
    '-strict',
    '-summary',
    '-kubernetes-version',
    kubernetesVersion,
    manifestPath,
  ],
  { stdio: 'inherit' },
);
for (const document of parseAllDocuments(manifest)) {
  const pod = document.getIn(['spec', 'template', 'spec']);
  if (!pod) continue;
  const spec = (
    pod as { toJSON(): Record<string, { image: string }[]> }
  ).toJSON();
  for (const container of [
    ...(spec.containers ?? []),
    ...(spec.initContainers ?? []),
  ])
    assert.equal(
      container.image,
      image,
      'Production values changed the checked image.',
    );
}
