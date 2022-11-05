import { showNotification } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons';

export const showErrorNotification = (message: string) =>
  showNotification({
    message,
    title: 'Oh oh!',
    color: 'red',
    icon: <IconX size={18} />,
    disallowClose: true,
  });

export const showSuccessNotification = (message: string) =>
  showNotification({
    message,
    title: 'Success!',
    color: 'green',
    icon: <IconCheck size={18} />,
    disallowClose: true,
  });
