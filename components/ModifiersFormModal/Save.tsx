import { Group } from '@mantine/core';
import Button from 'components/Button';
import type { FC } from 'react';

interface SaveProps {
  onClick: () => void;
}

const Save: FC<SaveProps> = ({ onClick }) => (
  <Group position='right'>
    <Button type='submit' onClick={onClick}>
      Save
    </Button>
  </Group>
);

export default Save;
