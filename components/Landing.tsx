import { Button, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { Modifiers } from 'lib/models/Modifiers';
import type { Dispatch, FC, SetStateAction } from 'react';
import Logo from './Logo';
import ModifiersFormModal from './ModifiersFormModal';

interface LandingProps {
  setModifiers: Dispatch<SetStateAction<Modifiers>>;
  setStarted: Dispatch<SetStateAction<boolean>>;
  questionCount: number;
}

const Landing: FC<LandingProps> = ({
  setModifiers,
  setStarted,
  questionCount,
}) => {
  const [opened, { close, open }] = useDisclosure(false);

  return (
    <>
      <ModifiersFormModal
        opened={opened}
        onClose={close}
        onSubmit={setModifiers}
      />
      <Logo />
      <Group>
        <Button variant='outline' onClick={open}>
          Modifiers
        </Button>
        <Button onClick={() => setStarted(true)}>Start</Button>
      </Group>
      {questionCount} Questions
    </>
  );
};

export default Landing;
