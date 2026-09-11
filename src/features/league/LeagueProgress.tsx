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
            ? `Quizmon League progress. ${currentStage.heading}, ${currentStage.title}.`
            : 'Five League trials'
      }
      className="league-progress"
    >
      {leagueStages.map((stage, index) => (
        <li
          aria-current={
            !completed && index === currentIndex ? 'step' : undefined
          }
          className={
            completed || index < currentIndex
              ? 'league-progress__stage league-progress__stage--complete'
              : index === currentIndex
                ? 'league-progress__stage league-progress__stage--current'
                : 'league-progress__stage'
          }
          key={stage.id}
        >
          <span aria-hidden="true">{stage.marker}</span>
          <span className="visually-hidden">
            {stage.heading}: {stage.title}
          </span>
        </li>
      ))}
    </ol>
  );
};
