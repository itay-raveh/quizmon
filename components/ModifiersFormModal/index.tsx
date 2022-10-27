import { Modal, Stack } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons';
import { type PokemonsInitialData } from 'lib/initialData';
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

  const showNoPokemonNotification = () =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    showNotification({
      title: 'Oh oh!',
      message: 'There are no Pokemon that match these modifiers',
      color: 'red',
      icon: <IconX size={18} />,
      disallowClose: true,
    });

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
            <Save
              onClose={
                filterPokemonsInitialData(form.values, pokemonsInitialData)
                  .length > 0
                  ? onClose
                  : showNoPokemonNotification
              }
            />
          </Stack>
        </form>
      </ModifiersFormProvider>
    </Modal>
  );
};

export default ModifiersFormModal;
