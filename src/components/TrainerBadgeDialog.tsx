import { useEffect, useRef } from 'react';
import type { TrainerBadge } from '@/game/trainer';
import { TrainerBadgeMark } from './TrainerBadgeMark';

interface TrainerBadgeDialogProps {
  badge: TrainerBadge;
  onClose: () => void;
}

export const TrainerBadgeDialog = ({
  badge,
  onClose,
}: TrainerBadgeDialogProps) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const progress = Math.min(badge.current, badge.goal);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);

  const closeDialog = () => {
    dialog.current?.close();
    onClose();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="trainer-badge-title"
      className="trainer-badge-dialog"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onPointerDown={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const outside =
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom;
        if (outside) closeDialog();
      }}
    >
      <header>
        <h2 id="trainer-badge-title">{badge.label}</h2>
        <button
          autoFocus
          aria-label="Close badge details"
          className="dialog-close"
          onClick={closeDialog}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div className="trainer-badge-dialog__body">
        <TrainerBadgeMark earned={badge.earned} id={badge.id} />
        <div className="trainer-badge-dialog__details">
          <strong className="trainer-badge-dialog__state">
            {badge.earned ? 'Badge earned' : 'Badge locked'}
          </strong>
          <p>{badge.requirement}</p>
          <div className="trainer-badge-dialog__progress-label">
            <span>Progress</span>
            <strong>
              {progress} / {badge.goal}
            </strong>
          </div>
          <progress
            aria-label={`${badge.label} progress`}
            max={badge.goal}
            value={progress}
          />
        </div>
      </div>
    </dialog>
  );
};
