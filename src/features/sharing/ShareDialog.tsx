import { DialogCloseButton } from '@/components/DialogCloseButton';
import { GameButton } from '@/components/GameButton';
import type { GameMode, GameResult } from '@/domain/quiz/types';
import {
  buildShareContent,
  copyResult,
} from '@/features/sharing/result-sharing';
import { useModalDialog } from '@/hooks/useModalDialog';
import { useInteractionSound } from '@/lib/audio/sound-context';
import { useState } from 'react';
import {
  BlueskyIcon,
  BlueskyShareButton,
  RedditIcon,
  RedditShareButton,
  TelegramIcon,
  TelegramShareButton,
  WhatsappIcon,
  WhatsappShareButton,
  XIcon,
  XShareButton,
} from 'react-share';

interface ShareDialogProps {
  mode: GameMode;
  onClose: () => void;
  result: GameResult;
}

const shareTargets = [
  { Button: WhatsappShareButton, Icon: WhatsappIcon, label: 'WhatsApp' },
  { Button: TelegramShareButton, Icon: TelegramIcon, label: 'Telegram' },
  { Button: XShareButton, Icon: XIcon, label: 'X' },
  { Button: BlueskyShareButton, Icon: BlueskyIcon, label: 'Bluesky' },
  { Button: RedditShareButton, Icon: RedditIcon, label: 'Reddit' },
];

const iconProps = {
  'aria-hidden': true,
  bgStyle: { fill: 'transparent' },
  borderRadius: 4,
  iconFillColor: 'currentColor',
  size: 28,
} as const;

export const ShareDialog = ({ mode, onClose, result }: ShareDialogProps) => {
  const [copyStatus, setCopyStatus] = useState('');
  const { dialogProps, closeDialog } = useModalDialog(onClose, {
    dismissOnBackdrop: true,
  });
  const playInteractionSound = useInteractionSound();
  const content = buildShareContent(mode, result);
  const message = `${content.title}\n${content.text}`;
  const playTap = () => playInteractionSound('tap');

  const copy = async () => {
    try {
      await copyResult(mode, result);
      setCopyStatus('Result copied.');
    } catch {
      setCopyStatus('Could not copy the result.');
    }
  };

  return (
    <dialog
      {...dialogProps}
      className="share-dialog"
      aria-labelledby="share-title"
    >
      <header className="share-dialog__header">
        <h2 id="share-title">Share result</h2>
        <DialogCloseButton
          autoFocus
          label="Close share options"
          onClick={closeDialog}
        />
      </header>

      <div className="share-dialog__body">
        <p>Send your spoiler-free score card.</p>
        <div className="share-targets">
          {shareTargets.map(({ Button, Icon, label }) => (
            <Button
              key={label}
              className="share-target"
              onClick={playTap}
              resetButtonStyle={false}
              title={message}
              url={content.url}
            >
              <Icon {...iconProps} />
              <span>{label}</span>
            </Button>
          ))}
        </div>

        <GameButton
          className="share-copy"
          tone="quiet"
          onClick={() => void copy()}
        >
          Copy result
        </GameButton>
        <p className="share-status" aria-live="polite">
          {copyStatus}
        </p>
      </div>
    </dialog>
  );
};
