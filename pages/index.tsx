import { Center, Stack } from '@mantine/core';
import { useCounter } from '@mantine/hooks';
import Landing from 'components/Landing';
import Question from 'components/Question';
import { ModifiersContext } from 'lib/context/ModifiersContext';
import { modifiersInitialValues } from 'lib/models/Modifiers';
import { pokeapi } from 'lib/pokeapi';
import type {
  GenRoman,
  GenToString,
  GenToStringArray,
} from 'lib/types/GenRoman';
import shuffle from 'lodash.shuffle';
import type { GetStaticProps, NextPage } from 'next';
import { useMemo, useState } from 'react';

interface IndexPageProps {
  genToPokemonFormNameList: GenToStringArray;
}

export const getStaticProps: GetStaticProps<IndexPageProps> = async () => {
  const pokemonFormResourceList = await pokeapi.pokemon.listPokemonForms(
    0,
    9999
  );

  const pokemonFormList = await Promise.all(
    pokemonFormResourceList.results.map((pokemonFormResource) =>
      pokeapi.pokemon.getPokemonFormByName(pokemonFormResource.name)
    )
  );

  const pokemonFormToGen = (await Promise.all(
    // for each form
    pokemonFormList
      // if its a pokemon,
      .filter((pokemonForm) => pokemonForm.name === pokemonForm.pokemon.name)
      .map(async (pokemonForm) => {
        // get its VersionGroup
        const versionGroup = await pokeapi.game.getVersionGroupByName(
          pokemonForm.version_group.name
        );

        // transform the VersionGroup gen name to be `GenRoman`  compatible
        const genName = versionGroup.generation.name
          .substring('generation-'.length)
          .toUpperCase() as GenRoman;

        return {
          [genName]: pokemonForm.name,
        };
      })
  )) as GenToString[];

  // reduce GenToString[] to GenToStringArray
  const pivotReduce = (pivoted: GenToStringArray, record: GenToString) => {
    let key: GenRoman;
    for (key in record) {
      if (!pivoted[key]) pivoted[key] = [];
      pivoted[key].push(record[key]);
    }
    return pivoted;
  };

  const genToPokemonFormNameList = pokemonFormToGen.reduce(
    pivotReduce,
    {} as GenToStringArray
  );

  return { props: { genToPokemonFormNameList } };
};

const IndexPage: NextPage<IndexPageProps> = ({ genToPokemonFormNameList }) => {
  const [modifiers, setModifiers] = useState(modifiersInitialValues);

  const [started, setStarted] = useState(false);

  // all pokemon form names from the generations selected in `modifiers.generations`
  const pokemonFormNameList = useMemo(
    () =>
      shuffle(
        Object.entries(genToPokemonFormNameList)
          .filter(([gen]) => modifiers.generations.includes(gen as GenRoman))
          .flatMap(([, pokemonFormName]) => pokemonFormName)
      ),
    [genToPokemonFormNameList, modifiers.generations]
  );

  // props for `Question`s for the forms in `pokemonFormNameList`
  const questionPropsList = useMemo(
    () =>
      pokemonFormNameList.map((pokemonFormName) => {
        // get 3 random other forms
        const otherOptions = shuffle(
          pokemonFormNameList.filter((name) => name !== pokemonFormName)
        ).slice(0, 3);

        // add the current form
        otherOptions.push(pokemonFormName);

        // shuffle again to create 4 options
        const options = shuffle(otherOptions);

        return {
          key: pokemonFormName,
          pokemonFormName,
          options,
        };
      }),
    [pokemonFormNameList]
  );

  const questionCount = modifiers.isLimitActive
    ? modifiers.limit
    : questionPropsList.length;

  const [questionIdx, { increment: nextQuestion }] = useCounter(0, {
    min: 0,
    max: questionCount,
  });

  let content;

  if (!started) {
    content = (
      <Landing
        setModifiers={setModifiers}
        setStarted={setStarted}
        questionCount={questionCount}
      />
    );
  } else {
    if (questionIdx < questionCount) {
      content = (
        <ModifiersContext.Provider value={modifiers}>
          <Question
            {...questionPropsList[questionIdx]}
            pokemonFormNameList={pokemonFormNameList}
            nextQuestion={nextQuestion}
          />
        </ModifiersContext.Provider>
      );
    } else {
      content = <div>End</div>;
    }
  }

  return (
    <main>
      <Center sx={{ height: '100vh' }}>
        <Stack align='center'>{content}</Stack>
      </Center>
      <footer>
        <a href='https://www.textstudio.co/'>Logo generator</a>
      </footer>
    </main>
  );
};

export default IndexPage;
