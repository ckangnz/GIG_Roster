import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isMobileSidebarOpen: boolean;
  isDesktopSidebarExpanded: boolean;
  expandedTeams: string[];
}

const initialState: UIState = {
  isMobileSidebarOpen: false,
  isDesktopSidebarExpanded: true,
  expandedTeams: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMobileSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileSidebarOpen = action.payload;
    },
    setDesktopSidebarExpanded: (state, action: PayloadAction<boolean>) => {
      state.isDesktopSidebarExpanded = action.payload;
    },
    toggleTeamExpansion: (state, action: PayloadAction<string>) => {
      const teamName = action.payload;
      const index = state.expandedTeams.indexOf(teamName);
      if (index >= 0) {
        state.expandedTeams.splice(index, 1);
      } else {
        state.expandedTeams.push(teamName);
      }
    },
  },
});

export const { setMobileSidebarOpen, setDesktopSidebarExpanded, toggleTeamExpansion } =
  uiSlice.actions;
export const uiReducer = uiSlice.reducer;
