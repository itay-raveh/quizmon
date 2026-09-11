import { GameButton } from '@/components/GameButton';
import { XIcon } from '@/components/icons';
import { SoundButton } from '@/components/SoundButton';
import { useInstall } from '@/features/installation/install-context';
import { useState } from 'react';
import { InstallDialog } from './InstallDialog';

export const InstallAction = ({
  onDismiss,
  compact = false,
}: {
  onDismiss?: () => void;
  compact?: boolean;
}) => {
  const { status, guide, busy, error, install } = useInstall();
  const [expanded, setExpanded] = useState(false);
  if (status === 'installed' || (status === 'unavailable' && !error))
    return null;
  const ActionButton = compact ? SoundButton : GameButton;
  const appearance = compact
    ? { className: 'install-link' }
    : { tone: 'quiet' as const };
  return (
    <div
      className={`install-action${compact ? ' install-action--compact' : ''}`}
    >
      <div className="install-action__buttons">
        {status === 'native' ? (
          <ActionButton
            {...appearance}
            disabled={busy}
            onClick={() => void install()}
          >
            {busy ? 'Opening…' : 'Install Quizmon'}
          </ActionButton>
        ) : guide ? (
          <ActionButton
            {...appearance}
            aria-haspopup="dialog"
            onClick={() => setExpanded(true)}
          >
            How to install
          </ActionButton>
        ) : null}
        {onDismiss ? (
          <SoundButton
            className="install-dismiss"
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
        <p className="experience-status experience-status--error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
