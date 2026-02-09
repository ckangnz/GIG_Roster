import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../index';

const selectUIState = (state: RootState) => state.ui;

export const selectActiveTab = createSelector([selectUIState], (ui) => ui.activeTab);

export const selectActiveSideItem = createSelector([selectUIState], (ui) => ui.activeSideItem);

export const selectActiveTeamName = createSelector([selectUIState], (ui) => ui.activeTeamName);

export const selectActiveSelection = createSelector(
  [selectActiveSideItem, selectActiveTeamName],
  (sideItem, teamName) => ({
    sideItem,
    teamName,
  }),
);

export const selectIsRosterTab = createSelector(
  [selectActiveTab],
  (activeTab) => activeTab === 'roster',
);

export const selectIsSettingsTab = createSelector(
  [selectActiveTab],
  (activeTab) => activeTab === 'settings',
);
