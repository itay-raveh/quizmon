import { Group, Text } from '@mantine/core';
import type { FC } from 'react';

interface BaseItemProps {
  title: React.ReactNode;
  value?: React.ReactNode;
  bold?: boolean;
}

interface MulItemProps extends BaseItemProps {
  multiplier: React.ReactNode;
  points?: never;
}

interface PointsItemProps extends BaseItemProps {
  multiplier?: never;
  points: React.ReactNode;
}

type ItemProps = MulItemProps | PointsItemProps;

const Item: FC<ItemProps> = ({ title, value, bold, multiplier, points }) => (
  <Text size='lg' weight={bold ? 700 : 500}>
    <Group grow>
      {Object.entries({
        title: { inner: <>{title}:</>, align: 'left' },
        value: { inner: value, align: 'center' },
        third: {
          inner: multiplier ? <>&times;{multiplier}</> : points,
          align: 'right',
        },
      }).map(([key, { inner, align }]) => (
        <Text key={key} align={align as React.CSSProperties['textAlign']}>
          {inner}
        </Text>
      ))}
    </Group>
  </Text>
);

export default Item;
