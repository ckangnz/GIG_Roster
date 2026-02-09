import { configureStore } from '@reduxjs/toolkit';

import { authMiddleware } from './middleware/authMiddleware';
import { authReducer } from './slices/authSlice';
import { rosterReducer } from './slices/rosterSlice';
import { uiReducer } from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    roster: rosterReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setUser'],
        ignoredPaths: ['auth.firebaseUser'],
      },
    }).concat(authMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
