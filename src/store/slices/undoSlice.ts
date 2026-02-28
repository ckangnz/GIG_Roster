import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UndoActionType = 'assignment' | 'absence' | 'eventName';

export interface AssignmentUndoPayload {
  date: string;
  teamName: string;
  userEmail: string;
  previousAssignments: string[];
  slotId?: string;
}

export interface AbsenceUndoPayload {
  date: string;
  userEmail: string;
  previousIsAbsent: boolean;
  previousReason: string;
  restoredAssignments?: Record<string, string[]>; // teamName -> positions[]
}

export interface EventNameUndoPayload {
  date: string;
  previousEventName: string;
}

export interface UndoAction {
  id: string;
  type: UndoActionType;
  timestamp: number;
  payload: AssignmentUndoPayload | AbsenceUndoPayload | EventNameUndoPayload;
  description: string;
}

interface UndoState {
  history: UndoAction[];
  maxHistory: number;
}

const initialState: UndoState = {
  history: [],
  maxHistory: 20,
};

const undoSlice = createSlice({
  name: 'undo',
  initialState,
  reducers: {
    pushAction: (state, action: PayloadAction<UndoAction>) => {
      state.history.unshift(action.payload);
      if (state.history.length > state.maxHistory) {
        state.history.pop();
      }
    },
    popAction: (state) => {
      state.history.shift();
    },
    clearHistory: (state) => {
      state.history = [];
    },
  },
});

export const { pushAction, popAction, clearHistory } = undoSlice.actions;
export const undoReducer = undoSlice.reducer;
