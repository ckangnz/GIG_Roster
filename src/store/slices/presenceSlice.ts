import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { PresenceUser } from '../../hooks/usePresence';

interface PresenceState {
  onlineUsers: PresenceUser[];
  error: string | null;
}

const initialState: PresenceState = {
  onlineUsers: [],
  error: null,
};

const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    setOnlineUsers: (state, action: PayloadAction<PresenceUser[]>) => {
      state.onlineUsers = action.payload;
      state.error = null;
    },
    setPresenceError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
});

export const { setOnlineUsers, setPresenceError } = presenceSlice.actions;
export const presenceReducer = presenceSlice.reducer;
