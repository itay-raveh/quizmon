import type { Difficulty } from '@/domain/quiz/difficulty';

export const LevelLabel = ({ level }: { level: Difficulty }) => (
  <span className="level-label">
    Level <span className="level-label__number">{level}</span>
  </span>
);
