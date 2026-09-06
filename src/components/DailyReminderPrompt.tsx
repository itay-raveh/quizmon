import { useEffect, useState } from 'react';
import { readCompletedDailyCount } from '@/game/storage';
import {
  markDailyReminderOffered,
  shouldOfferDailyReminder,
} from '@/notifications/daily-reminder-storage';
import { useDailyReminder } from '@/notifications/daily-reminder-context';
import { GameButton } from './GameButton';
import { BellSimpleRingingIcon } from './icons';

export const DailyReminderPrompt = ({ dailyDate }: { dailyDate: string }) => {
  const { busy, enable, error, recordDailyCompletion, status } =
    useDailyReminder();
  const [completedDailyCount] = useState(readCompletedDailyCount);
  const [visible, setVisible] = useState(() =>
    shouldOfferDailyReminder(completedDailyCount),
  );
  const canOffer = status === 'available' || status === 'install-required';

  useEffect(() => {
    recordDailyCompletion(dailyDate);
  }, [dailyDate, recordDailyCompletion]);

  useEffect(() => {
    if (visible && canOffer) {
      markDailyReminderOffered(completedDailyCount);
    }
  }, [canOffer, completedDailyCount, visible]);

  if (!visible || !canOffer) return null;

  const installRequired = status === 'install-required';
  return (
    <aside
      className="daily-reminder-offer"
      aria-labelledby="daily-reminder-title"
    >
      <BellSimpleRingingIcon aria-hidden="true" weight="bold" />
      <span className="daily-reminder-offer__copy">
        <strong id="daily-reminder-title">
          {installRequired ? 'Daily reminders need the app' : 'Daily reminder?'}
        </strong>
        <span>
          {installRequired
            ? 'Add Quizmon to your Home Screen, then turn on reminders.'
            : 'Get a reminder at 8:00 AM when the next Daily is ready.'}
        </span>
        {error ? <span role="alert">{error}</span> : null}
      </span>
      <span className="daily-reminder-offer__actions">
        {installRequired ? (
          <GameButton onClick={() => setVisible(false)}>Got it</GameButton>
        ) : (
          <GameButton disabled={busy} onClick={() => void enable()}>
            {busy ? 'Turning on…' : 'Remind me'}
          </GameButton>
        )}
        {!installRequired ? (
          <GameButton tone="quiet" onClick={() => setVisible(false)}>
            Not now
          </GameButton>
        ) : null}
      </span>
    </aside>
  );
};
