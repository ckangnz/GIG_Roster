import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../index';

const selectUIState = (state: RootState) => state.ui;

export const selectIsMobileSidebarOpen = createSelector(
  [selectUIState],
  (ui) => ui.isMobileSidebarOpen,
);

export const selectIsDesktopSidebarExpanded = createSelector(
  [selectUIState],
  (ui) => ui.isDesktopSidebarExpanded,
);

export const selectExpandedTeams = createSelector(
  [selectUIState],
  (ui) => ui.expandedTeams,
);