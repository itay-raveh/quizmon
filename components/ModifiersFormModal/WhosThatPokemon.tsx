import { useModifiersFormContext } from 'lib/modifiers/form/context';
import type { FC } from 'react';
import Checkbox from './Checkbox';

const WhosThatPokemon: FC = () => {
  const form = useModifiersFormContext();

  return (
    <Checkbox
      label="Who's That Pokémon?"
      description='You will see silhouettes rather than normal sprites'
      {...form.getInputProps('whosThatPokemon', { type: 'checkbox' })}
    />
  );
};

export default WhosThatPokemon;
