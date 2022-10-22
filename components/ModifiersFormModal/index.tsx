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
import { FormProvider, useForm } from './form';
import Generations from './Generations';

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
  const form = useForm({
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
      <FormProvider form={form}>
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack>
            <Generations />
        </Stack>
      </form>
      </FormProvider>
    </Modal>
  );
};

export default ModifiersFormModal;
