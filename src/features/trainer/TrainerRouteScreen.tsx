import type { TrainerView } from '../../domain/player/trainer-progression';
import { CatalogRouteState } from '../../app/CatalogRouteState';
import { useAppGameContext } from '../../app/AppGameContext';
import { TrainerPassport } from './TrainerPassport';

export const TrainerRouteScreen = ({
  view,
  editing = false,
}: {
  view: TrainerView;
  editing?: boolean;
}) => {
  const { catalogState, trainer } = useAppGameContext();
  if (catalogState.status !== 'ready')
    return <CatalogRouteState title="Trainer" />;
  return (
    <TrainerPassport
      catalog={catalogState.catalog}
      editing={editing}
      trainer={{ ...trainer, view }}
    />
  );
};
