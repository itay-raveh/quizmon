import type { Difficulty } from '@/domain/quiz/difficulty';

export const LevelLabel = ({ level }: { level: Difficulty }) => (
  <span className="level-label">
    <span className="level-label__word">Level</span>
    <span className="level-label__number">{level}</span>
  </span>
);
