import { createStyles, Text } from '@mantine/core';
import type { FC } from 'react';

const useStyles = createStyles((theme) => ({
  item: {
    marginTop: '0.1rem',
    marginBottom: '0.1rem',

    [theme.fn.smallerThan('sm')]: {
      fontSize: '0.6rem',
    },
  },
}));

export interface ItemProps {
  prefixText: string;
  linkText: string;
  linkHref: string;
}

const Item: FC<ItemProps> = ({ prefixText, linkText, linkHref }) => {
  const { classes } = useStyles();

  return (
    <Text className={classes.item}>
      {prefixText}{' '}
      <a href={linkHref} target='_blank' rel='noopener noreferrer'>
        {linkText}
      </a>
    </Text>
  );
};

export default Item;
