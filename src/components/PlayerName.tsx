import type { TrainerStats } from '@/domain/player/progress';
import type { TrainerProfile } from '@/domain/player/trainer-profile';
import type { SocialPlayer } from '@/domain/social/friends';
import { Trophy } from './Trophy';

type NamedTrainer =
  | Pick<SocialPlayer, 'name' | 'leagueCompleted'>
  | {
      profile: Pick<TrainerProfile, 'name'>;
      stats: Pick<TrainerStats, 'leagueCompleted'>;
      player?: Pick<SocialPlayer, 'name'>;
    };

export const PlayerName = ({
  trainer,
  fallback = 'Trainer',
}: {
  trainer: NamedTrainer;
  fallback?: string;
}) => {
  const name =
    'profile' in trainer
      ? trainer.profile.name || trainer.player?.name
      : trainer.name;
  const champion =
    'stats' in trainer
      ? trainer.stats.leagueCompleted
      : trainer.leagueCompleted;
  return (
    <span className="player-name">
      {name?.trim() || fallback}
      {champion && (
        <span className="player-name__honor" title="League Champion">
          <Trophy />
          <span className="visually-hidden">, League Champion</span>
        </span>
      )}
    </span>
  );
};
