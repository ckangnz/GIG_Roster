import { createContext, useContext } from 'react';

import { useAppSelector } from './redux';

interface LoadingContextType {
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: React.ReactNode; }) => {
  const loading = useAppSelector((state) => state.auth.loading);

  return <LoadingContext.Provider value={{ isLoading: loading }}>{children}</LoadingContext.Provider>;
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};
