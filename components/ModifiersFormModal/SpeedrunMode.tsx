import { useModifiersFormContext } from 'lib/modifiers/form/context';
import type { FC } from 'react';
import Checkbox from './Checkbox';

const SpeedrunMode: FC = () => {
  const form = useModifiersFormContext();

  return (
    <Checkbox
      label='Speedrun Mode'
      description='Completely remove the small delay between questions '
      {...form.getInputProps('speedrunMode', { type: 'checkbox' })}
    />
  );
};

export default SpeedrunMode;
