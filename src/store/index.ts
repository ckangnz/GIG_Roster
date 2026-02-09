import { configureStore } from '@reduxjs/toolkit';

import { authMiddleware } from './middleware/authMiddleware';
import { authReducer } from './slices/authSlice';
import { gendersReducer } from './slices/gendersSlice';
import { positionsReducer } from './slices/positionsSlice';
import { rosterReducer } from './slices/rosterSlice';
import { teamsReducer } from './slices/teamsSlice';
import { uiReducer } from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    genders: gendersReducer,
    positions: positionsReducer,
    roster: rosterReducer,
    teams: teamsReducer,
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
