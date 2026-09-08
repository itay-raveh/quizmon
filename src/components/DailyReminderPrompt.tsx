import { useEffect, useState } from 'react';
import { readCompletedDailyCount } from '@/game/storage';
import {
  markDailyReminderOffered,
  shouldOfferDailyReminder,
} from '@/notifications/daily-reminder-storage';
import { useDailyReminder } from '@/notifications/daily-reminder-context';
import { useInstall } from '@/pwa/install-context';
import { GameButton } from './GameButton';
import { InstallAction } from './InstallAction';
import { BellSimpleRingingIcon } from './icons';

export const DailyReminderPrompt = ({ dailyDate }: { dailyDate: string }) => {
  const { busy, enable, error, recordDailyCompletion, status } =
    useDailyReminder();
  const [completedDailyCount] = useState(readCompletedDailyCount);
  const installation = useInstall();
  const [offerInstall] = useState(
    () =>
      completedDailyCount >= 1 &&
      !installation.offerDismissed &&
      (installation.status === 'native' ||
        installation.status === 'instructions'),
  );
  const [visible, setVisible] = useState(
    () => offerInstall || shouldOfferDailyReminder(completedDailyCount),
  );
  const canOffer = !offerInstall && status === 'available';

  useEffect(() => {
    recordDailyCompletion(dailyDate);
  }, [dailyDate, recordDailyCompletion]);

  useEffect(() => {
    if (visible && canOffer) {
      markDailyReminderOffered(completedDailyCount);
    }
  }, [canOffer, completedDailyCount, visible]);

  if (!visible) return null;
  if (offerInstall) {
    if (
      installation.offerDismissed ||
      installation.status === 'installed' ||
      (installation.status === 'unavailable' && !installation.error)
    )
      return null;
    return (
      <aside
        className="daily-reminder-offer daily-reminder-offer--install"
        aria-labelledby="daily-install-title"
      >
        <span className="daily-reminder-offer__copy">
          <strong id="daily-install-title">Ready for tomorrow’s Daily?</strong>
        </span>
        <InstallAction
          compact
          onDismiss={() => {
            installation.dismissOffer();
            setVisible(false);
          }}
        />
      </aside>
    );
  }
  if (!canOffer) return null;
  return (
    <aside
      className="daily-reminder-offer"
      aria-labelledby="daily-reminder-title"
    >
      <BellSimpleRingingIcon aria-hidden="true" weight="bold" />
      <span className="daily-reminder-offer__copy">
        <strong id="daily-reminder-title">Daily reminder?</strong>
        <span>Get a reminder at 8:00 AM when the next Daily is ready.</span>
        {error ? <span role="alert">{error}</span> : null}
      </span>
      <span className="daily-reminder-offer__actions">
        <GameButton disabled={busy} onClick={() => void enable()}>
          {busy ? 'Turning on…' : 'Remind me'}
        </GameButton>
        <GameButton tone="quiet" onClick={() => setVisible(false)}>
          Not now
        </GameButton>
      </span>
    </aside>
  );
};
