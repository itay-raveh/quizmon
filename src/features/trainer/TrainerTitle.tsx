import {
  trainerSpecialtyDetails,
  trainerTierLabels,
  type TrainerSpecialty,
  type TrainerTier,
} from '@/domain/player/trainer-progression';
import { TrainerTitleMark } from './TrainerTitleMark';

export const TrainerTitle = ({
  specialty,
  tier,
}: {
  specialty: TrainerSpecialty;
  tier: TrainerTier;
}) => (
  <span className="trainer-title-label">
    <span>{trainerSpecialtyDetails[specialty].label}</span>
    <TrainerTitleMark plain tier={tier} specialty={specialty} />
    <span className="visually-hidden">, {trainerTierLabels[tier]} title</span>
  </span>
);
