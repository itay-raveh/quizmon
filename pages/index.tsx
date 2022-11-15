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
import Head from 'next/head';
import staticPokemonsInitialData from 'public/assets/pokemonsInitialData.json';
import { useMemo, useState } from 'react';
import { useStopwatch } from 'react-timer-hook';

interface IndexPageProps {
  pokemonsInitialData: PokemonsInitialData;
}

export const getStaticProps: GetStaticProps<IndexPageProps> = async () => {
  const pokemonsInitialData =
    (staticPokemonsInitialData as PokemonsInitialData) ??
    (await getPokemonsInitialData());

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

  const finalQuestion = questionIdx === questionCount - 1;

  const [
    correctCount,
    { increment: incrementCorrectCount, reset: resetCorrectCount },
  ] = useCounter(0, {
    min: 0,
    max: questionCount,
  });

  const newGame = () => {
    setPhase('landing');
    resetQuestionsCount();
    resetCorrectCount();
    stopwatch.reset();
    // make memos recompute
    setModifiers({ ...modifiers });
  };

  return (
    <>
      <Head>
        <title>The Ultimate Pokémon Test</title>
        <link
          rel='apple-touch-icon'
          sizes='180x180'
          href='/apple-touch-icon.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='32x32'
          href='/favicon-32x32.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='16x16'
          href='/favicon-16x16.png'
        />
        <link rel='manifest' href='/site.webmanifest' />
        <link rel='mask-icon' href='/safari-pinned-tab.svg' color='#5bbad5' />
        <meta name='msapplication-TileColor' content='#da532c' />
        <meta name='theme-color' content='#ffffff' />
      </Head>
      <main>
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
                  questionNumber={questionIdx + 1}
                  {...questionPropsList[questionIdx]}
                  stopwatch={stopwatch}
                  nextQuestion={(correct) => {
                    if (correct) incrementCorrectCount();
                    if (finalQuestion) setPhase('results');
                    nextQuestion();
                  }}
                  final={finalQuestion}
                  newGame={newGame}
                />
              ),
              results: (
                <Results
                  stopwatch={stopwatch}
                  questionCount={questionCount}
                  correctCount={correctCount}
                  newGame={newGame}
                />
              ),
            }}
          />
        </ModifiersProvider>
      </main>
    </>
  );
};

export default IndexPage;
