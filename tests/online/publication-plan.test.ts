import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicationPlan } from '../../deploy/publication-plan.ts';

const revision = 'a'.repeat(40);
const source = { revision, dirty: false };
const context = {
  repository: 'Example/Quizmon',
  revision,
  event: 'push',
  ref: 'refs/heads/main',
  runNumber: '42',
  runAttempt: '1',
};

await test('publication identifies the verified source and derives a repository-scoped image', () => {
  assert.deepEqual(publicationPlan(source, context), {
    image: 'ghcr.io/example/quizmon/release',
    tag: 'main-000000042-001-aaaaaaaaaaaa',
    reference:
      'ghcr.io/example/quizmon/release:main-000000042-001-aaaaaaaaaaaa',
    sourceUrl: 'https://github.com/Example/Quizmon',
    revision,
  });
});

await test('a late retry cannot sort above a newer workflow run', () => {
  const tags = ['9', '10', '42', '100'].flatMap((runNumber) =>
    ['1', '2', '999'].map(
      (runAttempt) =>
        publicationPlan(source, { ...context, runNumber, runAttempt }).tag,
    ),
  );
  assert.deepEqual([...tags].reverse().sort(), tags);
  assert.ok(
    publicationPlan(source, { ...context, runNumber: '41', runAttempt: '999' })
      .tag < publicationPlan(source, context).tag,
  );
});

await test('untrusted triggers, wrong source, dirty candidates, and malformed output fields are rejected', () => {
  for (const invalid of [
    null,
    {},
    { ...source, dirty: true },
    { ...source, revision: 'b'.repeat(40) },
  ])
    assert.throws(() => publicationPlan(invalid, context));
  for (const patch of [
    { event: 'pull_request' },
    { event: 'workflow_dispatch' },
    { ref: 'refs/heads/topic' },
    { revision: 'short' },
    { repository: 'owner/repo\nother=value' },
    { repository: '../../repo' },
    { runNumber: '0' },
    { runNumber: '01' },
    { runNumber: '1000000000' },
    { runAttempt: '1000' },
    { runAttempt: '-1' },
  ])
    assert.throws(() => publicationPlan(source, { ...context, ...patch }));
});
