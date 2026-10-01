import { GameButton } from '@/components/GameButton';
import { BellSimpleRingingIcon } from '@/components/icons';
import { useInstall } from '@/features/installation/install-context';
import { InstallAction } from '@/features/installation/InstallAction';
import { useDailyReminder } from '@/features/reminders/daily-reminder-context';
import { formatReminderTime } from '@/features/reminders/reminder-config';
import {
  markDailyReminderOffered,
  shouldOfferDailyReminder,
} from '@/features/reminders/daily-reminder-storage';
import { readCompletedDailyCount } from '@/lib/storage/results-storage';
import { useEffect, useState } from 'react';
import * as styles from './DailyReminderPrompt.css.ts';
import { resultsOffer } from '../../components/classes.css.ts';

export const DailyReminderPrompt = ({ dailyDate }: { dailyDate: string }) => {
  const { busy, enable, error, time, recordDailyCompletion, status } =
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
        className={`${resultsOffer} ${styles.dailyInstallOffer}`}
        aria-labelledby="daily-install-title"
      >
        <strong id="daily-install-title">Ready for tomorrow’s Daily?</strong>
        <InstallAction
          tone="primary"
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
    <aside className={styles.root} aria-labelledby="daily-reminder-title">
      <BellSimpleRingingIcon
        aria-hidden="true"
        className={styles.icon}
        weight="bold"
      />
      <span className={styles.copy}>
        <strong className={styles.title} id="daily-reminder-title">
          Daily reminder?
        </strong>
        <span className={styles.detail}>
          Get a reminder for the Daily at {formatReminderTime(time)} in your
          time zone. Change the time in Settings.
        </span>
        {error ? (
          <span className={styles.error} role="alert">
            {error}
          </span>
        ) : null}
      </span>
      <span className={styles.actions}>
        <GameButton
          className={styles.actionButton}
          disabled={busy}
          onClick={() => void enable()}
        >
          {busy ? 'Turning on…' : 'Remind me'}
        </GameButton>
        <GameButton
          className={styles.actionButton}
          tone="quiet"
          onClick={() => setVisible(false)}
        >
          Not now
        </GameButton>
      </span>
    </aside>
  );
};
