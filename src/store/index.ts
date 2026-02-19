import { configureStore } from '@reduxjs/toolkit';

import { authMiddleware } from './middleware/authMiddleware';
import { authReducer } from './slices/authSlice';
import { positionsReducer } from './slices/positionsSlice';
import { presenceReducer } from './slices/presenceSlice';
import { rosterReducer } from './slices/rosterSlice';
import { rosterViewReducer } from './slices/rosterViewSlice';
import { teamsReducer } from './slices/teamsSlice';
import { uiReducer } from './slices/uiSlice';
import { userManagementReducer } from './slices/userManagementSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    positions: positionsReducer,
    presence: presenceReducer,
    roster: rosterReducer,
    rosterView: rosterViewReducer,
    teams: teamsReducer,
    ui: uiReducer,
    userManagement: userManagementReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'auth/setUser',
          'roster/fetchEntries/fulfilled',
          'roster/saveChanges/fulfilled',
        ],
        ignoredPaths: [
          'auth.firebaseUser',
          'roster.entries',
          'roster.dirtyEntries',
          'rosterView.users',
          'rosterView.allTeamUsers',
        ],
      },
    }).concat(authMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
