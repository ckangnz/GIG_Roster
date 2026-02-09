import React from 'react';

import { LoadingContext } from './LoadingContext';
import { useAppSelector } from './redux';

export const LoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const loading = useAppSelector((state) => state.auth.loading);

  return (
    <LoadingContext.Provider value={{ isLoading: loading }}>{children}</LoadingContext.Provider>
  );
};
