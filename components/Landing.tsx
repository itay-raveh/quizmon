import { Center, createStyles, Grid, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { PokemonsInitialData } from 'lib/initialData';
import type { Modifiers } from 'lib/modifiers';
import type { Dispatch, FC, SetStateAction } from 'react';
import Button from './Button';
import Logo from './Logo';
import ModifiersFormModal from './ModifiersFormModal';

const useStyles = createStyles(() => ({
  grid: {
    width: '13rem',
    maxWidth: '50vw',
  },
  button: {
    width: '100%',
  },
}));

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
  const { classes } = useStyles();
  const [opened, { close, open }] = useDisclosure(false);

  return (
    <Center sx={{ height: '100vh' }}>
      <Stack align='center'>
        <ModifiersFormModal
          pokemonsInitialData={pokemonsInitialData}
          opened={opened}
          onClose={close}
          onSubmit={setModifiers}
        />
        <Logo />
        <Grid className={classes.grid}>
          <Grid.Col xs={12} sm={6}>
            <Button
              className={classes.button}
              size='md'
              variant='outline'
              onClick={open}
            >
              Modifiers
            </Button>
          </Grid.Col>
          <Grid.Col xs={12} sm={6}>
            <Button className={classes.button} size='md' onClick={start}>
              Start
            </Button>
          </Grid.Col>
        </Grid>
      </Stack>
    </Center>
  );
};

export default Landing;
