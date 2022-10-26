import { Center, Stack } from '@mantine/core';
import { useCounter } from '@mantine/hooks';
import Landing from 'components/Landing';
import Question from 'components/Question';
import Results from 'components/Results';
import { ModifiersContext } from 'lib/context/ModifiersContext';
import { modifiersInitialValues } from 'lib/models/Modifiers';
import { pokeapi } from 'lib/pokeapi';
import { knownFormCategories, type FormCategory } from 'lib/types/FormCategory';
import type { GenRoman } from 'lib/types/GenRoman';
import shuffle from 'lodash.shuffle';
import type { GetStaticProps, NextPage } from 'next';
import { useMemo, useState } from 'react';
import { useStopwatch } from 'react-timer-hook';

interface PokemonInitialData {
  formCategory: FormCategory;
  generation: GenRoman;
}

type PokemonsInitialData = { [name: string]: PokemonInitialData };

interface IndexPageProps {
  pokemonsInitialData: PokemonsInitialData;
}

export const getStaticProps: GetStaticProps<IndexPageProps> = async () => {
  const pokemonResources = await pokeapi.pokemon.listPokemons(
    0,
    9999 // all of them, hopefully
  );

  const pokemons = await Promise.all(
    pokemonResources.results.map((pokemonResource) =>
      pokeapi.pokemon.getPokemonByName(pokemonResource.name)
    )
  );

  const pokemonsInitialData: PokemonsInitialData =
    Object.fromEntries<PokemonInitialData>(
      await Promise.all(
        pokemons.map(async (pokemon) => {
          // assuming first form is default form
          const defaultFormName = pokemon.forms[0].name;

          const defaultForm = await pokeapi.pokemon.getPokemonFormByName(
            defaultFormName
          );

          const versionGroup = await pokeapi.game.getVersionGroupByName(
            defaultForm.version_group.name
          );

          // transform the `VersionGroup` gen name to `GenRoman`
          const generation = versionGroup.generation.name
            .substring('generation-'.length)
            .toUpperCase() as GenRoman;

          // determine form category
          let formCategory: FormCategory = 'other';
          if (pokemon.is_default) formCategory = 'default';
          // if a known category is the pokemon name, that is the category
          else
            knownFormCategories.forEach((category) => {
              if (pokemon.name.includes(`-${category}`))
                formCategory = category;
            });

          return [pokemon.name, { generation, formCategory }] as const;
        })
      )
    );

  return { props: { pokemonsInitialData } };
};

const IndexPage: NextPage<IndexPageProps> = ({ pokemonsInitialData }) => {
  const [modifiers, setModifiers] = useState(modifiersInitialValues);

  const [started, setStarted] = useState(false);

  const stopwatch = useStopwatch({ autoStart: false });

  // all pokemon form names from the generations selected in `modifiers.generations`
  const filteredPokemons = useMemo(
    () =>
      shuffle(
        Object.entries(pokemonsInitialData)
          .filter(
            ([, pokemonInitialData]) =>
              modifiers.generations.includes(pokemonInitialData.generation) &&
              modifiers.formCategories.includes(pokemonInitialData.formCategory)
          )
          .map(([name]) => name)
      ),
    [modifiers.formCategories, modifiers.generations, pokemonsInitialData]
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
        <ModifiersContext.Provider value={modifiers}>
          <Question
            {...questionPropsList[questionIdx]}
            stopwatch={stopwatch}
            nextQuestion={(correct) => {
              if (correct) incrementCorrectCount();
              nextQuestion();
            }}
          />
        </ModifiersContext.Provider>
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
        <Stack align='center'>{content}</Stack>
      </Center>
      <footer style={{ position: 'absolute', bottom: 0 }}>
        <a href='https://www.textstudio.co/'>Logo generator</a>
      </footer>
    </main>
  );
};

export default IndexPage;
