import { useInstall } from '@/pwa/install-context';
import { InstallAction } from './InstallAction';

export const InstallSetting = () => {
  const { status, error } = useInstall();
  if (status === 'installed' || (status === 'unavailable' && !error))
    return null;
  return (
    <fieldset className="experience-setting">
      <legend>Install Quizmon</legend>
      <p className="experience-status">
        Keep Quizmon within easy reach for your next Daily.
      </p>
      <InstallAction />
    </fieldset>
  );
};
