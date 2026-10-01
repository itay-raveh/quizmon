import * as styles from '../../styles/classes.css.ts';
import { GameButton } from '@/components/GameButton';
import { XIcon } from '@/components/icons';
import { SoundButton } from '@/components/SoundButton';
import { useInstall } from '@/features/installation/install-context';
import { useState } from 'react';
import { InstallDialog } from './InstallDialog';

export const InstallAction = ({
  onDismiss,
  tone = 'quiet',
}: {
  onDismiss?: () => void;
  tone?: 'primary' | 'quiet';
}) => {
  const { status, guide, busy, error, install } = useInstall();
  const [expanded, setExpanded] = useState(false);
  if (status === 'installed' || (status === 'unavailable' && !error))
    return null;
  return (
    <div className={styles.installAction}>
      <div className={styles.installActionButtons}>
        {status === 'native' ? (
          <GameButton
            tone={tone}
            disabled={busy}
            onClick={() => void install()}
          >
            {busy ? 'Opening…' : 'Install Quizmon'}
          </GameButton>
        ) : guide ? (
          <GameButton
            tone={tone}
            aria-haspopup="dialog"
            onClick={() => setExpanded(true)}
          >
            How to install
          </GameButton>
        ) : null}
        {onDismiss ? (
          <SoundButton
            className={styles.installDismiss}
            aria-label="Dismiss install offer"
            onClick={onDismiss}
          >
            <XIcon aria-hidden="true" weight="bold" />
          </SoundButton>
        ) : null}
      </div>
      {expanded && guide && status === 'instructions' ? (
        <InstallDialog guide={guide} onClose={() => setExpanded(false)} />
      ) : null}
      {error ? (
        <p
          className={`${styles.experienceStatus} ${styles.experienceStatusError}`}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
};
