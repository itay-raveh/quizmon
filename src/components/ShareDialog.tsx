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
import { useInteractionSound } from '@/audio/sound';
import { buildShareContent, copyResult } from '@/game/share';
import type { GameMode, GameResult } from '@/game/types';
import { DialogCloseButton } from './DialogCloseButton';
import { GameButton } from './GameButton';
import { isDialogBackdropPointerDown, useModalDialog } from './dialog';

interface ShareDialogProps {
  mode: GameMode;
  onClose: () => void;
  result: GameResult;
}

const iconProps = {
  'aria-hidden': true,
  bgStyle: { fill: 'transparent' },
  borderRadius: 4,
  iconFillColor: 'currentColor',
  size: 28,
} as const;

export const ShareDialog = ({ mode, onClose, result }: ShareDialogProps) => {
  const [copyStatus, setCopyStatus] = useState('');
  const dialog = useModalDialog();
  const playInteractionSound = useInteractionSound();
  const content = buildShareContent(mode, result);
  const message = `${content.title}\n${content.text}`;
  const playTap = () => playInteractionSound('tap');

  const closeDialog = () => {
    dialog.current?.close();
    onClose();
  };

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
      ref={dialog}
      className="share-dialog"
      aria-labelledby="share-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onPointerDown={(event) => {
        if (isDialogBackdropPointerDown(event)) closeDialog();
      }}
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
          <WhatsappShareButton
            className="share-target"
            onClick={playTap}
            resetButtonStyle={false}
            title={message}
            url={content.url}
          >
            <WhatsappIcon {...iconProps} />
            <span>WhatsApp</span>
          </WhatsappShareButton>
          <TelegramShareButton
            className="share-target"
            onClick={playTap}
            resetButtonStyle={false}
            title={message}
            url={content.url}
          >
            <TelegramIcon {...iconProps} />
            <span>Telegram</span>
          </TelegramShareButton>
          <XShareButton
            className="share-target"
            onClick={playTap}
            resetButtonStyle={false}
            title={message}
            url={content.url}
          >
            <XIcon {...iconProps} />
            <span>X</span>
          </XShareButton>
          <BlueskyShareButton
            className="share-target"
            onClick={playTap}
            resetButtonStyle={false}
            title={message}
            url={content.url}
          >
            <BlueskyIcon {...iconProps} />
            <span>Bluesky</span>
          </BlueskyShareButton>
          <RedditShareButton
            className="share-target"
            onClick={playTap}
            resetButtonStyle={false}
            title={message}
            url={content.url}
          >
            <RedditIcon {...iconProps} />
            <span>Reddit</span>
          </RedditShareButton>
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
