import { createContext, useContext } from 'react';
import { modifiersInitialValues } from '.';

const ModifiersContext = createContext(modifiersInitialValues);
ModifiersContext.displayName = 'ModifiersContext';

export const ModifiersProvider = ModifiersContext.Provider;
export const useModifiers = () => useContext(ModifiersContext);
