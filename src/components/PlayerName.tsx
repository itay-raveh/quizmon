import { Trophy } from './Trophy';

export const PlayerName = ({
  name,
  champion,
}: {
  name: string;
  champion: boolean;
}) => (
  <span className="player-name">
    {name}
    {champion && (
      <span className="player-name__honor" title="League Champion">
        <Trophy className="player-name__trophy" />
        <span className="visually-hidden">, League Champion</span>
      </span>
    )}
  </span>
);
