import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { verifyArtifact } from './release-artifact.ts';
import { publicationPlan } from './publication-plan.ts';

const directory = process.argv[2];
if (!directory)
  throw new Error('Usage: plan-publication.ts <artifact-directory>');
const manifest = await verifyArtifact(resolve(directory));
const plan = publicationPlan(manifest.source, {
  repository: process.env.GITHUB_REPOSITORY ?? '',
  revision: process.env.GITHUB_SHA ?? '',
  event: process.env.GITHUB_EVENT_NAME ?? '',
  ref: process.env.GITHUB_REF ?? '',
  runNumber: process.env.GITHUB_RUN_NUMBER ?? '',
  runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? '',
});
if (process.env.GITHUB_OUTPUT)
  await appendFile(
    process.env.GITHUB_OUTPUT,
    Object.entries(plan)
      .map(([key, value]) => `${key}=${value}\n`)
      .join(''),
  );
console.log(JSON.stringify(plan));
