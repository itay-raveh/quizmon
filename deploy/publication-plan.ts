import { isRecord } from '../src/lib/validation.ts';

export interface PublicationContext {
  repository: string;
  revision: string;
  event: string;
  ref: string;
  runNumber: string;
  runAttempt: string;
}

export function publicationPlan(source: unknown, context: PublicationContext) {
  if (context.event !== 'push' || context.ref !== 'refs/heads/main')
    throw new Error('Only a main-branch push can publish an eligible release.');
  if (
    !isRecord(source) ||
    source.dirty !== false ||
    typeof source.revision !== 'string' ||
    !/^[a-f0-9]{40}$/.test(context.revision) ||
    source.revision !== context.revision
  )
    throw new Error(
      'Publication requires the clean artifact from this exact revision.',
    );
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(
      context.repository,
    )
  )
    throw new Error('A GitHub owner/repository identity is required.');
  if (
    !/^[1-9]\d{0,8}$/.test(context.runNumber) ||
    !/^[1-9]\d{0,2}$/.test(context.runAttempt)
  )
    throw new Error('Run number or attempt exceeds the release tag format.');
  const image = 'ghcr.io/' + context.repository.toLowerCase() + '/release';
  const tag =
    'main-' +
    context.runNumber.padStart(9, '0') +
    '-' +
    context.runAttempt.padStart(3, '0') +
    '-' +
    context.revision.slice(0, 12);
  return {
    image,
    tag,
    reference: image + ':' + tag,
    sourceUrl: 'https://github.com/' + context.repository,
    revision: context.revision,
  };
}
