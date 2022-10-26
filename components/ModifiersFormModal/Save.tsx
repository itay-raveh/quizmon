import { Button, Group } from '@mantine/core';
import { useModifiersFormContext } from 'lib/modifiersForm';
import type { FC } from 'react';

interface SaveProps {
  onClose: () => void;
}

const Save: FC<SaveProps> = ({ onClose }) => {
  const form = useModifiersFormContext();

  return (
    <Group position='right'>
      <Button type='submit' onClick={onClose} disabled={!form.isValid()}>
        Save
      </Button>
    </Group>
  );
};

export default Save;
