import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../index';

const selectRosterState = (state: RootState) => state.roster;

export const selectRosterEntries = createSelector(
  [selectRosterState],
  (roster) => roster.entries,
);

export const selectRosterLoading = createSelector(
  [selectRosterState],
  (roster) => roster.loading,
);

export const selectRosterError = createSelector([selectRosterState], (roster) => roster.error);

export const selectRosterEntryById = (entryId: string) =>
  createSelector([selectRosterEntries], (entries) =>
    entries.find((entry) => entry.id === entryId),
  );

export const selectRosterEntriesByDate = (date: string) =>
  createSelector([selectRosterEntries], (entries) =>
    entries.filter((entry) => entry.date === date),
  );

export const selectRosterEntriesByTeam = (teamId: string) =>
  createSelector([selectRosterEntries], (entries) =>
    entries.filter((entry) => Object.keys(entry.teams).includes(teamId)),
  );

export const selectRosterEntriesByUser = (userEmail: string) =>
  createSelector([selectRosterEntries], (entries) =>
    entries.filter((entry) => {
      return Object.values(entry.teams).some((team) =>
        Object.values(team).some((positions) => positions.includes(userEmail)),
      );
    }),
  );

export const selectDateRange = (startDate: string, endDate: string) =>
  createSelector([selectRosterEntries], (entries) =>
    entries.filter((entry) => entry.date >= startDate && entry.date <= endDate),
  );

export const selectRosterStats = createSelector([selectRosterEntries], (entries) => {
  const totalEntries = entries.length;
  const uniqueDates = new Set(entries.map((e) => e.date)).size;
  const totalTeamAssignments = entries.reduce((sum, entry) => {
    return sum + Object.keys(entry.teams).length;
  }, 0);

  return {
    totalEntries,
    uniqueDates,
    totalTeamAssignments,
    avgTeamsPerDate: totalEntries > 0 ? totalTeamAssignments / uniqueDates : 0,
  };
});
