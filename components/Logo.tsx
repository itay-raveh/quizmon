import { Container } from '@mantine/core';
import Image from 'next/image';
import logo from 'public/logo.png';
import type { FC } from 'react';

const Logo: FC = () => (
  <Container
    sx={{
      width: '30rem',
      maxWidth: '90vw',
    }}
  >
    <Image
      src={logo}
      alt='Quizmon: The Ultimate Pokémon Knowledge Test'
      priority
      sizes='(max-width: 660px) 90vw,(max-width: 900px) 70vw,(max-width: 1200px) 45vw,(max-width: 1500px) 35vw,(max-width: 1920px) 30vw'
    />
  </Container>
);

export default Logo;
