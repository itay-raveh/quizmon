import type { ButtonHTMLAttributes, MouseEvent, PointerEvent } from 'react';
import useSound from 'use-sound';

const POP_DOWN = '/assets/sounds/pop-down.mp3';
const POP_UP = '/assets/sounds/pop-up-on.mp3';

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
  const [playDown] = useSound(POP_DOWN, { volume: 0.25 });
  const [playUp] = useSound(POP_UP, { volume: 0.25 });

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    playDown();
    onPointerDown?.(event);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    playUp();
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
