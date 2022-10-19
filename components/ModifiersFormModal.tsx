import {
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Stack,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { modifiersInitialValues, type Modifiers } from 'lib/models/Modifiers';
import { generations } from 'lib/types/GenRoman';
import type { FC } from 'react';

interface ModifiersFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: Modifiers) => void;
}

const ModifiersFormModal: FC<ModifiersFormModalProps> = ({
  opened,
  onClose,
  onSubmit,
}) => {
  const form = useForm<Modifiers>({
    initialValues: modifiersInitialValues,
    validate: {
      generations: (value) => (value.length < 1 ? 'Select at least one' : null),
    },
    validateInputOnChange: true,
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title='Modifiers'
      size='auto'
      centered
    >
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack>
          <Checkbox.Group
            label='Generations'
            description='You will only see Pokémon from these generations'
            spacing='xs'
            errorProps={{ sx: { marginTop: '0.3rem' } }}
            {...form.getInputProps('generations')}
          >
            {generations.map((gen) => (
              <Checkbox key={gen} value={gen} label={`Gen ${gen}`} />
            ))}
          </Checkbox.Group>
          <NumberInput
            label='Limit'
            description='Maximum number of questions'
            disabled={!form.values.isLimitActive}
            min={0}
            rightSection={
              <Checkbox
                {...form.getInputProps('isLimitActive', { type: 'checkbox' })}
                mr='xl'
              />
            }
            {...form.getInputProps('limit')}
          />
          <Group position='right'>
            <Button type='submit' onClick={onClose} disabled={!form.isValid()}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default ModifiersFormModal;
