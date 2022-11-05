import { Container, createStyles } from '@mantine/core';
import type { FC } from 'react';
import Item, { type ItemProps } from './Item';

const useStyles = createStyles((theme) => ({
  items: {
    display: 'flex',
    justifyContent: 'space-evenly',
    alignItems: 'center',

    [theme.fn.smallerThan('sm')]: {
      flexDirection: 'column',
    },
  },
}));

interface ItemsProps {
  items: ItemProps[];
}

const Items: FC<ItemsProps> = ({ items }) => {
  const { classes } = useStyles();

  return (
    <Container className={classes.items}>
      {items.map((item) => (
        <Item key={item.linkHref} {...item} />
      ))}
    </Container>
  );
};

export default Items;
