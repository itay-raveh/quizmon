import { Modal, Stack, Text } from '@mantine/core';
import type { PokemonsInitialData } from 'lib/initialData';
import { filterPokemonsInitialData, type Modifiers } from 'lib/modifiers';
import { useModifiers } from 'lib/modifiers/context';
import {
  makeUseFormInput,
  ModifiersFormProvider,
  useModifiersForm,
} from 'lib/modifiers/form/context';
import {
  showErrorNotification,
  showSuccessNotification,
} from 'lib/notifications';
import type { FC } from 'react';
import FormCategories from './FormCategories';
import Generations from './Generations';
import Limit from './Limit';
import ModifiersLoader from './ModifiersLoader';
import RandomSprite from './RandomSprite';
import Save from './Save';
import SpeedrunMode from './SpeedrunMode';
import WhosThatPokemon from './WhosThatPokemon';

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
  const form = useModifiersForm(makeUseFormInput(useModifiers()));

  let onSaveClick = () => {
    showSuccessNotification('Saved new modifiers.');
    onClose();
  };
  if (!form.isValid())
    onSaveClick = () =>
      showErrorNotification(
        'There are some errors in the form, check for red text and fix them.'
      );
  else if (
    filterPokemonsInitialData(form.values, pokemonsInitialData).length === 0
  )
    onSaveClick = () =>
      showErrorNotification('There are no Pokémon that match these filters.');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title='Modifiers & Filters'
      size='auto'
      centered
    >
      <ModifiersFormProvider form={form}>
        <ModifiersLoader />
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack>
            <Text weight={700}>Filters</Text>
            <Generations />
            <FormCategories />
            <Text weight={700}>Modifiers</Text>
            <RandomSprite />
            <WhosThatPokemon />
            <Text weight={700}>Settings</Text>
            <Limit />
            <SpeedrunMode />
            <Save onClick={onSaveClick} />
          </Stack>
        </form>
      </ModifiersFormProvider>
    </Modal>
  );
};

export default ModifiersFormModal;
