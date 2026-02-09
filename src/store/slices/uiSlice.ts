import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isMobileSidebarOpen: boolean;
  isDesktopSidebarExpanded: boolean;
  expandedTeams: string[];
  hiddenUsers: Record<string, Record<string, string[]>>; // team -> position -> userEmails[]
}

const loadHiddenUsers = (): Record<string, Record<string, string[]>> => {
  try {
    const saved = localStorage.getItem('hidden-users');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const initialState: UIState = {
  isMobileSidebarOpen: false,
  isDesktopSidebarExpanded: true,
  expandedTeams: [],
  hiddenUsers: loadHiddenUsers(),
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
    toggleUserVisibility: (
      state,
      action: PayloadAction<{ teamName: string; positionName: string; userEmail: string }>,
    ) => {
      const { teamName, positionName, userEmail } = action.payload;
      if (!state.hiddenUsers[teamName]) state.hiddenUsers[teamName] = {};
      if (!state.hiddenUsers[teamName][positionName]) state.hiddenUsers[teamName][positionName] = [];

      const list = state.hiddenUsers[teamName][positionName];
      const index = list.indexOf(userEmail);
      if (index >= 0) {
        list.splice(index, 1);
      } else {
        list.push(userEmail);
      }
      localStorage.setItem('hidden-users', JSON.stringify(state.hiddenUsers));
    },
  },
});

export const {
  setMobileSidebarOpen,
  setDesktopSidebarExpanded,
  toggleTeamExpansion,
  toggleUserVisibility,
} = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
