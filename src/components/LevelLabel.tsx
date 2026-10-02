import type { Level } from '@/domain/quiz/level';

export const LevelNumber = ({ level }: { level: Level }) => (
  <span className="level-label__number">{level}</span>
);

export const LevelLabel = ({ level }: { level: Level }) => (
  <span className="level-label">
    Level <LevelNumber level={level} />
  </span>
);
