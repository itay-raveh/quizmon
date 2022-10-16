import { Button, Center, Code, Group, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import ModifiersFormModal from 'components/ModifiersFormModal';
import { modifiersInitialValues } from 'lib/models/Modifiers';
import type { NextPage } from 'next';
import Image from 'next/future/image';
import logo from 'public/logo.png';
import { useState } from 'react';

const IndexPage: NextPage = () => {
  const [modifiers, setModifiers] = useState(modifiersInitialValues);
  const [opened, { close, open }] = useDisclosure(false);

  return (
    <main>
      <ModifiersFormModal
        opened={opened}
        onClose={close}
        onSubmit={setModifiers}
      />
      <Center sx={{ height: '100vh' }}>
        <Stack align='center'>
          <Image
            src={logo}
            alt='Quizmon: The Ultimate Pokémon Knowledge Test'
            style={{ maxWidth: '30rem', height: 'auto' }}
            priority
          />
          <Group>
            <Button variant='outline' onClick={open}>
              Modifiers
            </Button>
            <Button>Start</Button>
          </Group>
          <Code block>{JSON.stringify(modifiers, undefined, 2)}</Code>
        </Stack>
      </Center>
      <footer>
        <a href='https://www.textstudio.co/'>Logo generator</a>
      </footer>
    </main>
  );
};

export default IndexPage;
