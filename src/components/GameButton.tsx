import { SoundButton, type SoundButtonProps } from './SoundButton';

type GameButtonProps = SoundButtonProps & {
  tone?: 'primary' | 'quiet';
};

export const GameButton = ({
  className = '',
  tone = 'primary',
  ...props
}: GameButtonProps) => (
  <SoundButton
    {...props}
    className={`game-button game-button--${tone} ${className}`.trim()}
  />
);
