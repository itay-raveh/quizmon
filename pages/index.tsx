import { Button, Center, Checkbox, Stack } from '@mantine/core';
import logo from '@public/logo.png';
import { numToRoman } from 'lib/util/numToRoman';
import range from 'lodash.range';
import type { NextPage } from 'next';
import Image from 'next/future/image';
import { useDispatch, useSelector } from 'react-redux';
import { selectGenerations, setGenerations } from 'store/generationsSlice';

interface IndexPageProps {}

const IndexPage: NextPage<IndexPageProps> = () => {
  const generations = useSelector(selectGenerations);
  const dispatch = useDispatch();

  return (
    <main>
      <Center sx={{ height: '100vh' }}>
        <Stack align='center'>
          <Image
            src={logo}
            alt='Quizmon: The Ultimate Pokémon Knowledge Test'
            style={{ maxWidth: '30rem', height: 'auto' }}
            priority
          />
          {/* <a href='https://www.textstudio.co/'>Logo generator</a> */}

          <Checkbox.Group
            value={generations}
            onChange={(generations) => dispatch(setGenerations(generations))}
            label='Select Generations'
            description='you will only see Pokémon from these generations'
          >
            {range(1, 9)
              .map(numToRoman)
              .map((gen) => (
                <Checkbox key={gen} value={gen} label={`Gen ${gen}`} />
              ))}
          </Checkbox.Group>
          <Button size='xl'>Start</Button>
        </Stack>
      </Center>
    </main>
  );
};

export default IndexPage;
