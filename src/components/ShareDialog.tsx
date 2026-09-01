import { useEffect, useRef, useState } from 'react';
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
import { buildShareContent, copyResult } from '@/game/share';
import type { GameMode, GameResult } from '@/game/types';
import { GameButton } from './GameButton';

interface ShareDialogProps {
  mode: GameMode;
  onClose: () => void;
  result: GameResult;
}

const iconProps = {
  'aria-hidden': true,
  bgStyle: { fill: 'transparent' },
  borderRadius: 4,
  iconFillColor: '#083b7e',
  size: 28,
} as const;

export const ShareDialog = ({ mode, onClose, result }: ShareDialogProps) => {
  const [copyStatus, setCopyStatus] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const content = buildShareContent(mode, result);
  const message = `${content.title}\n${content.text}`;

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
        const bounds = event.currentTarget.getBoundingClientRect();
        const outside =
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom;
        if (outside) closeDialog();
      }}
    >
      <header className="share-dialog__header">
        <h2 id="share-title">Share result</h2>
        <button
          className="dialog-close"
          aria-label="Close share options"
          autoFocus
          onClick={closeDialog}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div className="share-dialog__body">
        <p>Send your spoiler-free score card.</p>
        <div className="share-targets">
          <WhatsappShareButton
            className="share-target"
            resetButtonStyle={false}
            title={message}
            url={content.url}
          >
            <WhatsappIcon {...iconProps} />
            <span>WhatsApp</span>
          </WhatsappShareButton>
          <TelegramShareButton
            className="share-target"
            resetButtonStyle={false}
            title={message}
            url={content.url}
          >
            <TelegramIcon {...iconProps} />
            <span>Telegram</span>
          </TelegramShareButton>
          <XShareButton
            className="share-target"
            resetButtonStyle={false}
            title={message}
            url={content.url}
          >
            <XIcon {...iconProps} />
            <span>X</span>
          </XShareButton>
          <BlueskyShareButton
            className="share-target"
            resetButtonStyle={false}
            title={message}
            url={content.url}
          >
            <BlueskyIcon {...iconProps} />
            <span>Bluesky</span>
          </BlueskyShareButton>
          <RedditShareButton
            className="share-target"
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
