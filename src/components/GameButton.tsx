import type { ComponentPropsWithRef, MouseEvent } from 'react';
import { useGameSounds } from '@/audio/sound';

type GameButtonProps = ComponentPropsWithRef<'button'> & {
  clickSound?: 'none' | 'on';
  tone?: 'primary' | 'quiet';
};

export const GameButton = ({
  clickSound = 'on',
  className = '',
  onClick,
  tone = 'primary',
  type = 'button',
  ...props
}: GameButtonProps) => {
  const { playTap } = useGameSounds();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (clickSound === 'on') playTap();
    onClick?.(event);
  };

  return (
    <button
      {...props}
      className={`game-button game-button--${tone} ${className}`.trim()}
      onClick={handleClick}
      type={type}
    />
  );
};
