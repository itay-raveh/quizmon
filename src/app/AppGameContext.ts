import { createContext, useContext } from 'react';
import type { AppGame } from './App';

export const AppGameContext = createContext<AppGame | null>(null);

export const useAppGameContext = () => {
  const game = useContext(AppGameContext);
  if (!game) throw new Error('Game state is unavailable');
  return game;
};
