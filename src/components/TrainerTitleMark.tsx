import type { Icon } from '@phosphor-icons/react';
import type { TrainerSpecialty } from '@/game/trainer';
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
  earned: boolean;
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
  earned,
  specialty,
}: TrainerTitleMarkProps) => {
  const Mark = earned ? titleMarks[specialty] : LockSimpleIcon;

  return (
    <span
      aria-hidden="true"
      className="trainer-title-mark"
      data-earned={earned}
      data-specialty={specialty}
    >
      <Mark weight="bold" />
    </span>
  );
};
