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
  <Text size='xl' weight={bold ? 700 : 500}>
    <Group grow>
      {Object.entries({
        title: <>{title}:</>,
        value,
        third: multiplier ? <>&times;{multiplier}</> : points,
      }).map(([key, inner]) => (
        <Text key={key}>{inner}</Text>
      ))}
    </Group>
  </Text>
);

export default Item;
