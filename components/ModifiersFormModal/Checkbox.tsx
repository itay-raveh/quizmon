import { Checkbox as MantineCheckbox, CheckboxProps } from '@mantine/core';
import type { FC } from 'react';
import useSound from 'use-sound';

import popDown from 'public/sounds/pop-down.mp3';
import popUpOff from 'public/sounds/pop-up-off.mp3';
import popUpOn from 'public/sounds/pop-up-on.mp3';

const Checkbox: FC<CheckboxProps> = (props) => {
  const [playActive] = useSound(popDown as string, {
    id: 'active',
    volume: 0.25,
  });
  const [playOn] = useSound(popUpOn as string, { id: 'on', volume: 0.25 });
  const [playOff] = useSound(popUpOff as string, { id: 'off', volume: 0.25 });

  return (
    <MantineCheckbox
      onMouseDown={() => playActive()}
      onMouseUp={() => {
        props.checked ? playOff() : playOn();
      }}
      {...props}
    />
  );
};

export default Checkbox;
