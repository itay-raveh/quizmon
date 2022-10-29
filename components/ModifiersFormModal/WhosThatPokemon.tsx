import { Checkbox } from '@mantine/core';
import { useModifiersFormContext } from 'lib/modifiers/form/context';
import type { FC } from 'react';

const WhosThatPokemon: FC = () => {
  const form = useModifiersFormContext();

  return (
    <Checkbox
      label="Who's That Pokémon?"
      description='You will see silhouettes rather than normal sprites'
      {...form.getInputProps('whosThatPokemon', { type: 'checkbox' })}
      mr='xl'
    />
  );
};

export default WhosThatPokemon;
