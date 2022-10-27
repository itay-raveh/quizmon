import { createContext, useContext } from 'react';
import { initialValues } from '.';

const ModifiersContext = createContext(initialValues);
ModifiersContext.displayName = 'ModifiersContext';

export const ModifiersProvider = ModifiersContext.Provider;
export const useModifiers = () => useContext(ModifiersContext);
