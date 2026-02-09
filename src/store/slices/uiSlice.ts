import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  activeTab: string;
  activeSideItem: string | null;
  activeTeamName: string | null;
}

const initialState: UIState = {
  activeTab: 'roster',
  activeSideItem: null,
  activeTeamName: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    setActiveSideItem: (state, action: PayloadAction<string | null>) => {
      state.activeSideItem = action.payload;
    },
    setActiveTeamName: (state, action: PayloadAction<string | null>) => {
      state.activeTeamName = action.payload;
    },
    setActiveSelection: (
      state,
      action: PayloadAction<{ teamName: string | null; sideItem: string | null; }>,
    ) => {
      state.activeTeamName = action.payload.teamName;
      state.activeSideItem = action.payload.sideItem;
    },
  },
});

export const { setActiveTab, setActiveSideItem, setActiveTeamName, setActiveSelection } =
  uiSlice.actions;
export const uiReducer = uiSlice.reducer;
