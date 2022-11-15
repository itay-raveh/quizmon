import { Button as MantineButton, ButtonProps } from '@mantine/core';
import type { PolymorphicComponentProps } from '@mantine/utils';
import popDown from 'public/assets/sounds/pop-down.mp3';
import popUpOn from 'public/assets/sounds/pop-up-on.mp3';
import type { FC } from 'react';
import useSound from 'use-sound';

const Button: FC<PolymorphicComponentProps<'button', ButtonProps>> = (
  props
) => {
  const [playActive] = useSound(popDown, {
    id: 'active',
    volume: 0.25,
  });
  const [playOn] = useSound(popUpOn, { id: 'on', volume: 0.25 });

  return (
    <MantineButton
      onMouseDown={() => playActive()}
      onMouseUp={() => playOn()}
      {...props}
    />
  );
};

export default Button;
