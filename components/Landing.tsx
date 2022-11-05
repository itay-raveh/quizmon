import { Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { PokemonsInitialData } from 'lib/initialData';
import type { Modifiers } from 'lib/modifiers';
import type { Dispatch, FC, SetStateAction } from 'react';
import Button from './Button';
import Logo from './Logo';
import ModifiersFormModal from './ModifiersFormModal';

interface LandingProps {
  pokemonsInitialData: PokemonsInitialData;
  setModifiers: Dispatch<SetStateAction<Modifiers>>;
  start: () => void;
}

const Landing: FC<LandingProps> = ({
  pokemonsInitialData,
  setModifiers,
  start,
}) => {
  const [opened, { close, open }] = useDisclosure(false);

  return (
    <>
      <ModifiersFormModal
        pokemonsInitialData={pokemonsInitialData}
        opened={opened}
        onClose={close}
        onSubmit={setModifiers}
      />
      <Logo />
      <Group>
        <Button size='md' variant='outline' onClick={open}>
          Modifiers
        </Button>
        <Button size='md' onClick={start}>
          Start
        </Button>
      </Group>
    </>
  );
};

export default Landing;
