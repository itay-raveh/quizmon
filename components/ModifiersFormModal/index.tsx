import { Modal, Stack } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons';
import type { PokemonsInitialData } from 'lib/initialData';
import { filterPokemonsInitialData, type Modifiers } from 'lib/modifiers';
import {
  ModifiersFormProvider,
  useModifiersForm,
} from 'lib/modifiers/form/context';
import type { FC } from 'react';
import FormCategories from './FormCategories';
import Generations from './Generations';
import Limit from './Limit';
import Save from './Save';

interface ModifiersFormModalProps {
  pokemonsInitialData: PokemonsInitialData;
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: Modifiers) => void;
}

const ModifiersFormModal: FC<ModifiersFormModalProps> = ({
  pokemonsInitialData,
  opened,
  onClose,
  onSubmit,
}) => {
  const form = useModifiersForm();

  const showErrorNotification = (message: string) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    showNotification({
      message,
      title: 'Oh oh!',
      color: 'red',
      icon: <IconX size={18} />,
      disallowClose: true,
    });

  const showSuccessNotification = (message: string) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    showNotification({
      message,
      title: 'Success!',
      color: 'green',
      icon: <IconCheck size={18} />,
      disallowClose: true,
    });

  let onSaveClick = () => {
    showSuccessNotification('Saved new modifiers.');
    onClose();
  };
  if (!form.isValid())
    onSaveClick = () =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      showErrorNotification(
        'There are some errors in the form, check for red text and fix them.'
      );
  else if (
    filterPokemonsInitialData(form.values, pokemonsInitialData).length === 0
  )
    onSaveClick = () =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      showErrorNotification('There are no Pokemon that match these modifiers.');

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
            <Save onClick={onSaveClick} />
          </Stack>
        </form>
      </ModifiersFormProvider>
    </Modal>
  );
};

export default ModifiersFormModal;
