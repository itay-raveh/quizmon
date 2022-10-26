import { Modal, Stack } from '@mantine/core';
import { type Modifiers } from 'lib/models/Modifiers';
import type { FC } from 'react';
import { FormProvider, useForm, useFormInput } from './form';
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
  const form = useForm(useFormInput);

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
