import { Button, Group } from '@mantine/core';
import type { FC } from 'react';
import { useFormContext } from './form';

interface SaveProps {
  onClose: () => void;
}

const Save: FC<SaveProps> = ({ onClose }) => {
  const form = useFormContext();

  return (
    <Group position='right'>
      <Button type='submit' onClick={onClose} disabled={!form.isValid()}>
        Save
      </Button>
    </Group>
  );
};

export default Save;
