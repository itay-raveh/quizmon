import type { ComponentProps } from 'react';
import type { Level } from '@/domain/quiz/level';
import { GameButton } from './GameButton';
import { LevelNumber } from './LevelLabel';
import './training-level-button.css';

export const TrainingLevelButton = ({
  level,
  className = '',
  ...props
}: Omit<ComponentProps<typeof GameButton>, 'children'> & { level: Level }) => (
  <GameButton
    aria-label={`Choose training level. Level ${level} selected`}
    tone="quiet"
    {...props}
    className={`training-level-button ${className}`.trim()}
  >
    <span className="training-level-button__label">Level</span>
    <span className="training-level-button__value" aria-hidden="true">
      <LevelNumber level={level} />
    </span>
  </GameButton>
);
