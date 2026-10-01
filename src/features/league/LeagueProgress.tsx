import * as styles from './classes.css.ts';
import { getLeagueStage, leagueStages } from '@/domain/quiz/league';

interface LeagueProgressProps {
  currentQuestion?: number;
  completed?: boolean;
}

export const LeagueProgress = ({
  currentQuestion,
  completed = false,
}: LeagueProgressProps) => {
  const currentStage =
    currentQuestion === undefined ? undefined : getLeagueStage(currentQuestion);
  const currentIndex = currentStage ? leagueStages.indexOf(currentStage) : -1;

  return (
    <ol
      aria-label={
        completed
          ? 'Quizmon League progress. All five trials complete.'
          : currentStage
            ? `Quizmon League progress. ${currentStage.heading}, Level ${currentStage.level}, ${currentStage.title}.`
            : 'Five League trials'
      }
      className={styles.leagueProgress}
    >
      {leagueStages.map((stage, index) => (
        <li
          aria-current={
            !completed && index === currentIndex ? 'step' : undefined
          }
          className={
            completed || index < currentIndex
              ? `${styles.leagueProgressStage} ${styles.leagueProgressStageComplete}`
              : index === currentIndex
                ? `${styles.leagueProgressStage} ${styles.leagueProgressStageCurrent}`
                : styles.leagueProgressStage
          }
          key={stage.id}
        >
          <span aria-hidden="true">{stage.marker}</span>
          <span className="visually-hidden">
            {stage.heading}: Level {stage.level}, {stage.title}
          </span>
        </li>
      ))}
    </ol>
  );
};
