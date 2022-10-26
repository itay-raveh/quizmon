import { Modal, Stack } from '@mantine/core';
import { ModifiersContext } from 'lib/context/ModifiersContext';
import type { Modifiers } from 'lib/models/Modifiers';
import { useContext, type FC } from 'react';
import { FormProvider, makeUseFormInput, useForm } from './form';
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
  const modifiers = useContext(ModifiersContext);
  const form = useForm(makeUseFormInput(modifiers));

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
