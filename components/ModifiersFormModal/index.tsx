import { Modal, Stack } from '@mantine/core';
import { modifiersInitialValues, type Modifiers } from 'lib/models/Modifiers';
import type { FC } from 'react';
import { FormProvider, useForm } from './form';
import FormCategories from './FormCategories';
import Generations from './Generations';
import Limit from './Limit';
import Save from './Save';

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
      formCategories: (value) =>
        value.length < 1 ? 'Select at least one' : null,
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
            <FormCategories />
            <Limit />
            <Save onClose={onClose} />
          </Stack>
        </form>
      </FormProvider>
    </Modal>
  );
};

export default ModifiersFormModal;
