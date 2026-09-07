import trophy from '@/assets/images/champion-trophy.png';

export const ChampionTrophy = ({ className = '' }: { className?: string }) => (
  <img
    className={`champion-trophy ${className}`.trim()}
    src={trophy}
    alt=""
    aria-hidden="true"
    width="64"
    height="64"
  />
);
