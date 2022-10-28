import { createStyles, Text } from '@mantine/core';
import type { FC } from 'react';

const useStyles = createStyles((theme) => ({
  item: {
    [theme.fn.smallerThan('sm')]: {
      marginTop: theme.spacing.xs,
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
