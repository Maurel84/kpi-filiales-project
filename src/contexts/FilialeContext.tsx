import { createContext, useContext } from 'react';

type Filiale = {
  id: string;
  nom: string | null;
  code: string | null;
};

type FilialeContextValue = {
  filialeId: string | null;
  setFilialeId: (id: string | null) => void;
  isAdmin: boolean;
  filiales: Filiale[];
};

const FilialeContext = createContext<FilialeContextValue | null>(null);

export const useFilialeContext = () => {
  const context = useContext(FilialeContext);
  if (!context) {
    throw new Error('useFilialeContext must be used within FilialeContext.Provider');
  }
  return context;
};

export { FilialeContext };
