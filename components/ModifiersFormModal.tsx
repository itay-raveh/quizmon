import { Button, Checkbox, Group, Modal } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Modifiers, modifiersInitialValues } from 'lib/models/Modifiers';
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
        <Group position='right' mt='1rem'>
          <Button type='submit' onClick={onClose} disabled={!form.isValid()}>
            Save
          </Button>
        </Group>
      </form>
    </Modal>
  );
};

export default ModifiersFormModal;
