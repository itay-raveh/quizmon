import { Link } from 'react-router';
import { useInteractionSound } from '../../lib/audio/sound-context';

export function SocialSections({ active }: { active: 'rankings' | 'friends' }) {
  const playSound = useInteractionSound();
  return (
    <nav className="social-sections" aria-label="Social sections">
      <Link
        to="/social/rankings"
        aria-current={active === 'rankings' ? 'page' : undefined}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
          if (active === 'rankings') event.preventDefault();
          else playSound('tap');
        }}
      >
        Rankings
      </Link>
      <Link
        to="/social/friends"
        aria-current={active === 'friends' ? 'page' : undefined}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
          if (active === 'friends') event.preventDefault();
          else playSound('tap');
        }}
      >
        Friends
      </Link>
    </nav>
  );
}
