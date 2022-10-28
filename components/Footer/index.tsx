import { createStyles } from '@mantine/core';
import type { FC } from 'react';
import Items from './Items';

const useStyles = createStyles((theme) => ({
  footer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    backdropFilter: 'blur(100px)',
    borderTop: `1px solid ${theme.colors.gray[2]}`,
  },
}));

const Footer: FC = () => {
  const { classes } = useStyles();

  return (
    <footer className={classes.footer}>
      {/* <Center> */}
      <Items
        items={[
          {
            prefixText: 'Logo generated with',
            linkText: 'Text Studio',
            linkHref: 'https://www.textstudio.co',
          },
          {
            prefixText: 'Pokémon data from',
            linkText: 'PokéAPI',
            linkHref: 'https://pokeapi.co',
          },
          {
            prefixText: 'Pokémon is a trademark of',
            linkText: 'Nintendo',
            linkHref: 'https://www.nintendo.com',
          },
        ]}
      />
      {/* </Center> */}
    </footer>
  );
};

export default Footer;
