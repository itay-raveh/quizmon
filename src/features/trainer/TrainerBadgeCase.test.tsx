import { getTrainerStats } from '@/domain/player/progress';
import { emptyResults } from '@/domain/player/results';
import { getTrainerBadges } from '@/domain/player/trainer-progression';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { TrainerBadgeCase } from './TrainerBadgeCase';

test('home preview keeps badge tiles out of the link interaction', () => {
  const badges = getTrainerBadges(getTrainerStats(emptyResults()));
  const preview = renderToStaticMarkup(
    <a href="/trainer/badges">
      <TrainerBadgeCase badges={badges} compact />
    </a>,
  );
  const caseHtml = renderToStaticMarkup(
    <TrainerBadgeCase badges={badges} onSelect={() => {}} />,
  );

  expect(preview).not.toContain('<button');
  expect(preview).toContain('aria-hidden="true"');
  expect(caseHtml).toContain('<button');
});
