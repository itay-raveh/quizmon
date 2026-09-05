import type { TrainerSpecialty } from '@/game/trainer';

interface TrainerTitleMarkProps {
  earned: boolean;
  specialty: TrainerSpecialty;
}

const titleMarks = {
  ability: 'A',
  description: 'F',
  evolution: 'E',
  identity: 'P',
  matchup: 'B',
  move: 'M',
  stat: 'S',
  type: 'T',
} satisfies Record<TrainerSpecialty, string>;

export const TrainerTitleMark = ({
  earned,
  specialty,
}: TrainerTitleMarkProps) => (
  <span
    aria-hidden="true"
    className="trainer-title-mark"
    data-earned={earned}
    data-specialty={specialty}
  >
    {titleMarks[specialty]}
  </span>
);
