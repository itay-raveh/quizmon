import { Container, createStyles } from '@mantine/core';
import { FC } from 'react';
import Item, { ItemProps } from './Item';

const useStyles = createStyles((theme) => ({
  items: {
    display: 'flex',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,

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
