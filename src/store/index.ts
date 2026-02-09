import { configureStore } from '@reduxjs/toolkit';

import { authMiddleware } from './middleware/authMiddleware';
import { authReducer } from './slices/authSlice';
import { positionsReducer } from './slices/positionsSlice';
import { rosterReducer } from './slices/rosterSlice';
import { rosterViewReducer } from './slices/rosterViewSlice';
import { teamsReducer } from './slices/teamsSlice';
import { uiReducer } from './slices/uiSlice';
import { userManagementReducer } from './slices/userManagementSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    positions: positionsReducer,
    roster: rosterReducer,
    rosterView: rosterViewReducer,
    teams: teamsReducer,
    ui: uiReducer,
    userManagement: userManagementReducer,
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
