import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AlertConfig {
  title: string;
  message: string;
  onConfirm?: () => void;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
}

export type FocusedCellTable = 'roster' | 'absence' | 'all';

export interface FocusedCell {
  row: number;
  col: number;
  table: FocusedCellTable;
}

interface UIState {
  isMobileSidebarOpen: boolean;
  isDesktopSidebarExpanded: boolean;
  expandedTeams: string[];
  hiddenUsers: Record<string, Record<string, string[]>>; // team -> position -> userEmails[]
  lastVisitedPaths: Record<string, string>; // tabId -> fullPathWithSearch
  rosterAllViewMode: 'user' | 'position';
  alertConfig: AlertConfig | null;
  peekPositionName: string | null;
  focusedCell: FocusedCell | null;
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
  lastVisitedPaths: {},
  rosterAllViewMode: 'user',
  alertConfig: null,
  peekPositionName: null,
  focusedCell: null,
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
    setRosterAllViewMode: (state, action: PayloadAction<'user' | 'position'>) => {
      state.rosterAllViewMode = action.payload;
    },
    setLastVisitedPath: (state, action: PayloadAction<{ tabId: string; path: string }>) => {
      const { tabId, path } = action.payload;
      state.lastVisitedPaths[tabId] = path;
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
    expandTeam: (state, action: PayloadAction<string>) => {
      const teamName = action.payload;
      if (!state.expandedTeams.includes(teamName)) {
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
    showAlert: (state, action: PayloadAction<AlertConfig>) => {
      state.alertConfig = action.payload;
    },
    hideAlert: (state) => {
      state.alertConfig = null;
    },
    setPeekPositionName: (state, action: PayloadAction<string | null>) => {
      state.peekPositionName = action.payload;
    },
    setFocusedCell: (state, action: PayloadAction<FocusedCell | null>) => {
      state.focusedCell = action.payload;
    },
  },
});

export const {
  setMobileSidebarOpen,
  setDesktopSidebarExpanded,
  setRosterAllViewMode,
  setLastVisitedPath,
  toggleTeamExpansion,
  expandTeam,
  toggleUserVisibility,
  showAlert,
  hideAlert,
  setPeekPositionName,
  setFocusedCell,
} = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
