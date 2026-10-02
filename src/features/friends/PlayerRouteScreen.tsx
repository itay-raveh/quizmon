import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useAppGameContext } from '../../app/AppGameContext';
import { PublicTrainerScreen } from './PublicTrainerScreen';

export const PlayerRouteScreen = () => {
  const { catalogState } = useAppGameContext();
  const { id } = useParams({ from: '/players/$id' });
  const { from, friendId, date, scope, mode } = useSearch({
    from: '/players/$id',
  });
  const navigate = useNavigate();
  return (
    <PublicTrainerScreen
      playerId={id}
      catalog={
        catalogState.status === 'ready' ? catalogState.catalog : undefined
      }
      catalogError={catalogState.status === 'error'}
      onBack={() => {
        if (from === 'friends')
          void navigate({ to: '/account/friends', search: { id: friendId } });
        else void navigate({ to: '/rankings', search: { date, scope, mode } });
      }}
      onRetryCatalog={catalogState.retry}
      backLabel={from === 'friends' ? 'Back to friends' : 'Back to rankings'}
    />
  );
};
