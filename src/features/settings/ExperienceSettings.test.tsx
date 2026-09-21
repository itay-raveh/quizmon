import { defaultGameSettings } from '@/domain/settings/game-settings';
import { InstallContext } from '@/features/installation/install-context';
import { DailyReminderContext } from '@/features/reminders/daily-reminder-context';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { ExperienceSettings } from './ExperienceSettings';

test.each([
  [
    'available',
    [
      'Daily Challenge reminder',
      'Answer flow',
      'Sound',
      'Timer',
      'Install Quizmon',
    ],
  ],
  [
    'install-required',
    [
      'Daily Challenge reminder',
      'Install Quizmon',
      'Answer flow',
      'Sound',
      'Timer',
    ],
  ],
] as const)('orders settings when reminders are %s', (status, expected) => {
  const markup = renderToStaticMarkup(
    <DailyReminderContext.Provider
      value={{
        busy: false,
        disable: () => Promise.resolve(),
        enable: () => Promise.resolve(),
        error: null,
        recordDailyCompletion: () => undefined,
        status,
      }}
    >
      <InstallContext.Provider
        value={{
          status: 'native',
          guide: null,
          busy: false,
          error: null,
          offerDismissed: false,
          dismissOffer: () => undefined,
          install: () => Promise.resolve(),
        }}
      >
        <ExperienceSettings
          draft={defaultGameSettings}
          onChange={() => undefined}
        />
      </InstallContext.Provider>
    </DailyReminderContext.Provider>,
  );

  expect(
    Array.from(
      markup.matchAll(/<legend>(.*?)<\/legend>/g),
      ([, label]) => label,
    ),
  ).toEqual(expected);
  expect(markup).not.toContain('Reduce motion');
});
