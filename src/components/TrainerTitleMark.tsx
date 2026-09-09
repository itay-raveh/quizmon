import type { Icon } from '@phosphor-icons/react';
import type { TrainerSpecialty, TrainerTier } from '@/game/trainer';
import {
  ArrowsClockwiseIcon,
  BinocularsIcon,
  ChartBarIcon,
  IdentificationCardIcon,
  LightningIcon,
  LockSimpleIcon,
  PuzzlePieceIcon,
  ShapesIcon,
  SwordIcon,
} from './icons';

interface TrainerTitleMarkProps {
  plain?: boolean;
  tier: TrainerTier;
  specialty: TrainerSpecialty;
}

const titleMarks = {
  ability: PuzzlePieceIcon,
  description: BinocularsIcon,
  evolution: ArrowsClockwiseIcon,
  identity: IdentificationCardIcon,
  matchup: SwordIcon,
  move: LightningIcon,
  stat: ChartBarIcon,
  type: ShapesIcon,
} satisfies Record<TrainerSpecialty, Icon>;

export const TrainerTitleMark = ({
  plain = false,
  specialty,
  tier,
}: TrainerTitleMarkProps) => {
  const earned = tier > 0;
  const Mark = plain || earned ? titleMarks[specialty] : LockSimpleIcon;

  if (plain) return <Mark aria-hidden="true" weight="bold" />;

  return (
    <span
      aria-hidden="true"
      className="trainer-title-mark"
      data-earned={earned}
      data-specialty={specialty}
      data-tier={tier}
    >
      <Mark weight="bold" />
      {earned ? (
        <small className="trainer-title-mark__tier">
          {['', 'I', 'II', 'III'][tier]}
        </small>
      ) : null}
    </span>
  );
};
