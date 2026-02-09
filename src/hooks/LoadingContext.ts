import { createContext } from 'react';

export interface LoadingContextType {
  isLoading: boolean;
}

export const LoadingContext = createContext<LoadingContextType | undefined>(undefined);
