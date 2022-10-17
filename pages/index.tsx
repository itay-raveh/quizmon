import { Button, Center, Group, Loader, Stack } from '@mantine/core';
import { useCounter, useDisclosure } from '@mantine/hooks';
import ModifiersFormModal from 'components/ModifiersFormModal';
import Question from 'components/Question';
import { modifiersInitialValues } from 'lib/models/Modifiers';
import { pokeapi } from 'lib/pokeapi';
import type { NextPage } from 'next';
import Image from 'next/future/image';
import logo from 'public/logo.png';
import { useMemo, useState } from 'react';
import { useQueries } from 'react-query';

const IndexPage: NextPage = () => {
  const [modifiers, setModifiers] = useState(modifiersInitialValues);

  const [started, setStarted] = useState(false);

  const [opened, { close, open }] = useDisclosure(false);

  const genQueriesResults = useQueries(
    modifiers.generations.map((_, idx) => ({
      queryKey: ['generation', idx + 1],
      queryFn: () =>
        pokeapi.game
          .getGenerationById(idx + 1)
          .then((gen) => gen.pokemon_species.map((species) => species.name)),
    }))
  );

  const pokemonNameList = genQueriesResults.flatMap(
    (genResult) => genResult.data
  );

  const questions = useMemo(
    () =>
      pokemonNameList.map((pokemonName) =>
        pokemonName ? (
          <Question
            pokemonName={pokemonName}
            pokemonNameList={pokemonNameList}
            modifiers={modifiers}
          />
        ) : (
          <Loader />
        )
      ),
    [modifiers, pokemonNameList]
  );

  const [questionIdx, { increment: nextQuestion, decrement: prevQuestion }] =
    useCounter(0, { min: 0, max: pokemonNameList.length - 1 });

  return (
    <main>
      <ModifiersFormModal
        opened={opened}
        onClose={close}
        onSubmit={setModifiers}
      />
      <Center sx={{ height: '100vh' }}>
        <Stack align='center'>
          {!started ? (
            <>
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
                <Button onClick={() => setStarted(true)}>Start</Button>
              </Group>
            </>
          ) : (
            <>
              {questions[questionIdx]}
              <Group>
                <Button onClick={prevQuestion}>Back</Button>
                <Button onClick={nextQuestion}>Next</Button>
              </Group>
            </>
          )}
        </Stack>
      </Center>
      <footer>
        <a href='https://www.textstudio.co/'>Logo generator</a>
      </footer>
    </main>
  );
};

export default IndexPage;
