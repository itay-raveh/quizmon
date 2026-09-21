import { GameButton } from '../../components/GameButton';

export function SocialSections({
  active,
  onRankings,
  onFriends,
}: {
  active: 'rankings' | 'friends';
  onRankings?: () => void;
  onFriends?: () => void;
}) {
  return (
    <nav className="social-sections" aria-label="Social sections">
      <GameButton
        aria-current={active === 'rankings' ? 'page' : undefined}
        tone={active === 'rankings' ? 'primary' : 'quiet'}
        onClick={active === 'rankings' ? undefined : onRankings}
      >
        Rankings
      </GameButton>
      <GameButton
        aria-current={active === 'friends' ? 'page' : undefined}
        tone={active === 'friends' ? 'primary' : 'quiet'}
        onClick={active === 'friends' ? undefined : onFriends}
      >
        Friends
      </GameButton>
    </nav>
  );
}
