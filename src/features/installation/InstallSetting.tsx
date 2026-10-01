import * as styles from '../settings/classes.css.ts';
import { useInstall } from '@/features/installation/install-context';
import { InstallAction } from './InstallAction';

export const InstallSetting = () => {
  const { status, error } = useInstall();
  if (status === 'installed' || (status === 'unavailable' && !error))
    return null;
  return (
    <fieldset
      className={`${styles.experienceSetting} ${styles.experienceSettingInstall}`}
    >
      <legend>Install Quizmon</legend>
      <p className={styles.experienceStatus}>
        Keep Quizmon within easy reach for your next Daily.
      </p>
      <InstallAction />
    </fieldset>
  );
};
