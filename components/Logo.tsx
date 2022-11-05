import Image from 'next/future/image';
import logo from 'public/logo.png';
import type { FC } from 'react';

const Logo: FC = () => (
  <Image
    src={logo}
    alt='Quizmon: The Ultimate Pokémon Knowledge Test'
    style={{ width: '30rem', maxWidth: '90vw', height: 'auto' }}
    priority
  />
);

export default Logo;
