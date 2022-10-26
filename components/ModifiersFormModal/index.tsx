import { Modal, Stack } from '@mantine/core';
import { ModifiersContext } from 'lib/context/ModifiersContext';
import type { Modifiers } from 'lib/models/Modifiers';
import {
  makeUseFormInput,
  ModifiersFormProvider,
  useModifiersForm,
} from 'lib/modifiersForm';
import { useContext, type FC } from 'react';
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
  const form = useModifiersForm(makeUseFormInput(modifiers));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title='Modifiers'
      size='auto'
      centered
    >
      <ModifiersFormProvider form={form}>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack>
            <Generations />
            <FormCategories />
            <Limit />
            <Save onClose={onClose} />
          </Stack>
        </form>
      </ModifiersFormProvider>
    </Modal>
  );
};

export default ModifiersFormModal;
