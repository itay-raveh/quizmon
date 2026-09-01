import type { ButtonHTMLAttributes, MouseEvent, PointerEvent } from 'react';
import { useGameSounds } from '@/audio/sound';

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'primary' | 'quiet';
}

export const GameButton = ({
  className = '',
  onClick,
  onPointerDown,
  tone = 'primary',
  type = 'button',
  ...props
}: GameButtonProps) => {
  const { playDown, playOn } = useGameSounds();

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    playDown();
    onPointerDown?.(event);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    playOn();
    onClick?.(event);
  };

  return (
    <button
      {...props}
      className={`game-button game-button--${tone} ${className}`.trim()}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      type={type}
    />
  );
};
