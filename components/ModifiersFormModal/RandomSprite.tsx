import { useModifiersFormContext } from 'lib/modifiers/form/context';
import type { FC } from 'react';
import Checkbox from './Checkbox';

const RandomSprite: FC = () => {
  const form = useModifiersFormContext();

  return (
    <Checkbox
      label='Random Sprite'
      description='Pick randomly between all available sprites for a Pokémon rather than use the best one'
      {...form.getInputProps('randomSprite', { type: 'checkbox' })}
    />
  );
};

export default RandomSprite;
