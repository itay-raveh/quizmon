import { Center, Stack } from '@mantine/core';
import { useCounter, useLocalStorage } from '@mantine/hooks';
import Landing from 'components/Landing';
import Question from 'components/Question';
import Results from 'components/Results';
import SPRouter from 'components/SPRouter';
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

type Phase = 'landing' | 'questions' | 'results';

const IndexPage: NextPage<IndexPageProps> = ({ pokemonsInitialData }) => {
  const [modifiers, setModifiers] = useLocalStorage({
    key: 'modifiers',
    defaultValue: initialValues,
  });

  const [phase, setPhase] = useState<Phase>('landing');

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

  const [questionIdx, { increment: nextQuestion, reset: resetQuestionsCount }] =
    useCounter(0, {
      min: 0,
      max: questionCount,
    });

  const [
    correctCount,
    { increment: incrementCorrectCount, reset: resetCorrectCount },
  ] = useCounter(0, {
    min: 0,
    max: questionCount,
  });

  return (
    <main>
      <Center sx={{ height: '100vh' }}>
        <Stack align='center'>
          <ModifiersProvider value={modifiers}>
            <SPRouter
              page={phase}
              pages={{
                landing: (
                  <Landing
                    pokemonsInitialData={pokemonsInitialData}
                    setModifiers={setModifiers}
                    start={() => {
                      stopwatch.start();
                      setPhase('questions');
                    }}
                  />
                ),
                questions: (
                  <Question
                    {...questionPropsList[questionIdx]}
                    stopwatch={stopwatch}
                    nextQuestion={(correct) => {
                      if (correct) incrementCorrectCount();
                      if (questionIdx === questionCount - 1)
                        setPhase('results');
                      else nextQuestion();
                    }}
                  />
                ),
                results: (
                  <Results
                    stopwatch={stopwatch}
                    questionCount={questionCount}
                    correctCount={correctCount}
                    newGame={() => {
                      setPhase('landing');
                      resetQuestionsCount();
                      resetCorrectCount();
                      // make memos recompute
                      setModifiers({ ...modifiers });
                    }}
                  />
                ),
              }}
            />
          </ModifiersProvider>
        </Stack>
      </Center>
    </main>
  );
};

export default IndexPage;
