import { Navigate, useNavigate, useSearch } from '@tanstack/react-router';
import { useAppGameContext } from '../../app/AppGameContext';
import { CatalogRouteState } from '../../app/CatalogRouteState';
import { QuestionRouteScreen, ResultsRouteScreen } from '../../app/GameScreen';
import { getTrainerBadges } from '../../domain/player/trainer-progression';
import { isLeagueVictory } from '../../domain/quiz/league';
import { LeagueDestination } from './LeagueDestination';

const LeagueView = ({ celebrate = false }: { celebrate?: boolean }) => {
  const { catalogState, league, navigation, session, trainer } =
    useAppGameContext();
  const navigate = useNavigate();
  const { view } = useSearch({ from: '/league' });
  if (catalogState.status !== 'ready')
    return <CatalogRouteState title="Quizmon League" />;
  const victory =
    session.phase === 'results' &&
    session.mode.kind === 'league' &&
    isLeagueVictory(session.result);
  return (
    <LeagueDestination
      catalog={catalogState.catalog}
      completed={trainer.stats.leagueCompleted || victory}
      celebrate={celebrate}
      onBack={() => {
        league.close();
        navigation.returnToLanding();
      }}
      onStart={() => void league.start()}
      onViewResults={
        victory
          ? () => void navigate({ to: '/league', search: { view: 'results' } })
          : undefined
      }
      view={
        trainer.stats.leagueCompleted || victory
          ? view === 'challenge'
            ? 'challenge'
            : 'hall'
          : 'challenge'
      }
      onViewChange={league.open}
      freshRecord={
        session.phase === 'results' ? session.leagueRecord : undefined
      }
      resultSaved={session.phase === 'results' ? session.resultSaved : true}
    />
  );
};

export const LeagueRouteScreen = () => {
  const { session, trainer } = useAppGameContext();
  const { view } = useSearch({ from: '/league' });
  const unlocked = getTrainerBadges(trainer.stats).every(
    ({ earned }) => earned,
  );
  if (session.phase === 'questions') return <QuestionRouteScreen />;
  if (session.phase === 'results') {
    if (session.mode.kind !== 'league' || !isLeagueVictory(session.result))
      return <Navigate to="/" replace />;
    return view === 'results' ? (
      <ResultsRouteScreen />
    ) : (
      <LeagueView celebrate />
    );
  }
  if (!unlocked) return <Navigate to="/" replace />;
  if (view === 'results')
    return (
      <Navigate
        to="/league"
        search={{ view: trainer.stats.leagueCompleted ? 'hall' : 'challenge' }}
        replace
      />
    );
  return <LeagueView />;
};
