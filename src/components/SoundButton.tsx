import { Button } from '@base-ui/react/button';
import {
  useInteractionSound,
  type InteractionSound,
} from '@/lib/audio/sound-context';
import type { ComponentPropsWithRef, MouseEvent } from 'react';

export type SoundButtonProps = ComponentPropsWithRef<'button'> & {
  sound?: InteractionSound;
};

export const SoundButton = ({
  onClick,
  sound = 'tap',
  type = 'button',
  ...props
}: SoundButtonProps) => {
  const playInteractionSound = useInteractionSound();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    playInteractionSound(sound);
    onClick?.(event);
  };

  return <Button {...props} onClick={handleClick} type={type} />;
};
