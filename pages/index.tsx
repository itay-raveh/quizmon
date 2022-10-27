import { Center, Stack } from '@mantine/core';
import { useCounter } from '@mantine/hooks';
import Landing from 'components/Landing';
import Question from 'components/Question';
import Results from 'components/Results';
import {
  getPokemonsInitialData,
  type PokemonsInitialData,
} from 'lib/initialData';
import { filterPokemonsInitialData, initialValues } from 'lib/modifiers';
import { ModifiersProvider } from 'lib/modifiers/context';
import shuffle from 'lodash.shuffle';
import type { GetStaticProps, NextPage } from 'next';
import { useMemo, useState } from 'react';
import { useStopwatch } from 'react-timer-hook';

interface IndexPageProps {
  pokemonsInitialData: PokemonsInitialData;
}

export const getStaticProps: GetStaticProps<IndexPageProps> = async () => {
  const pokemonsInitialData = await getPokemonsInitialData();

  return { props: { pokemonsInitialData } };
};

const IndexPage: NextPage<IndexPageProps> = ({ pokemonsInitialData }) => {
  const [modifiers, setModifiers] = useState(initialValues);

  const [started, setStarted] = useState(false);

  const stopwatch = useStopwatch({ autoStart: false });

  const filteredPokemons = useMemo(
    () => shuffle(filterPokemonsInitialData(modifiers, pokemonsInitialData)),
    [modifiers, pokemonsInitialData]
  );

  // props for `Question`s for the forms in `filteredPokemons`
  const questionPropsList = useMemo(
    () =>
      filteredPokemons.map((name) => {
        // get 3 random other pokemon
        const otherOptions = shuffle(
          filteredPokemons.filter((otherName) => otherName !== name)
        ).slice(0, 3);

        // add the current pokemon
        otherOptions.push(name);

        // shuffle again to create 4 options
        const options = shuffle(otherOptions);

        return {
          key: name,
          pokemonName: name,
          options,
        };
      }),
    [filteredPokemons]
  );

  const questionCount = modifiers.isLimitActive
    ? modifiers.limit
    : questionPropsList.length;

  const [questionIdx, { increment: nextQuestion }] = useCounter(0, {
    min: 0,
    max: questionCount,
  });

  const [correctCount, { increment: incrementCorrectCount }] = useCounter(0, {
    min: 0,
    max: questionCount,
  });

  let content;

  if (!started) {
    content = (
      <Landing
        setModifiers={setModifiers}
        start={() => {
          setStarted(true);
          stopwatch.start();
        }}
      />
    );
  } else {
    if (questionIdx < questionCount) {
      content = (
        <Question
          {...questionPropsList[questionIdx]}
          stopwatch={stopwatch}
          nextQuestion={(correct) => {
            if (correct) incrementCorrectCount();
            nextQuestion();
          }}
        />
      );
    } else {
      content = (
        <Results
          stopwatch={stopwatch}
          questionCount={questionCount}
          correctCount={correctCount}
        />
      );
    }
  }

  return (
    <main>
      <Center sx={{ height: '100vh' }}>
        <Stack align='center'>
          <ModifiersProvider value={modifiers}>{content}</ModifiersProvider>
        </Stack>
      </Center>
      <footer style={{ position: 'absolute', bottom: 0 }}>
        <a href='https://www.textstudio.co/'>Logo generator</a>
      </footer>
    </main>
  );
};

export default IndexPage;
