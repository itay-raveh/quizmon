import { modifiersInitialValues } from 'lib/models/Modifiers';
import { createContext } from 'react';

export const ModifiersContext = createContext(modifiersInitialValues);
ModifiersContext.displayName = 'ModifiersContext';
