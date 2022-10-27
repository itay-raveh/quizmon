import { createContext } from 'react';
import { modifiersInitialValues } from '.';

export const ModifiersContext = createContext(modifiersInitialValues);
ModifiersContext.displayName = 'ModifiersContext';
