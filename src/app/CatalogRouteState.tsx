import { GameButton } from '../components/GameButton';
import { useAppGameContext } from './AppGameContext';

export const CatalogRouteState = ({ title }: { title: string }) => {
  const { catalogState } = useAppGameContext();
  return (
    <section className="catalog-route-state">
      <h1>{title}</h1>
      {catalogState.status === 'loading' ? (
        <p role="status">Loading Pokémon data…</p>
      ) : (
        <>
          <p role="alert">Pokémon data could not be loaded.</p>
          <GameButton onClick={catalogState.retry}>Try again</GameButton>
        </>
      )}
    </section>
  );
};
