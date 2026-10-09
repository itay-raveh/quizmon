import { Fieldset } from '@base-ui/react/fieldset';
import { useInstall } from '@/features/installation/install-context';
import { InstallAction } from './InstallAction';

export const InstallSetting = () => {
  const { status, error } = useInstall();
  if (status === 'installed' || (status === 'unavailable' && !error))
    return null;
  return (
    <Fieldset.Root className="experience-setting experience-setting--install">
      <Fieldset.Legend render={<legend />}>Install Quizmon</Fieldset.Legend>
      <p className="experience-status">
        Keep Quizmon within easy reach for your next Daily.
      </p>
      <InstallAction />
    </Fieldset.Root>
  );
};
