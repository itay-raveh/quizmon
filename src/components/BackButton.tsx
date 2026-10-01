import { ArrowLeftIcon } from './icons';
import { GameButton } from './GameButton';

export const BackButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <GameButton
    aria-label={label}
    className="back-button"
    onClick={onClick}
    tone="quiet"
  >
    <ArrowLeftIcon aria-hidden="true" weight="bold" />
    <span className="back-button__label">{label}</span>
  </GameButton>
);
