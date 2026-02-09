import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../index';

const selectRosterStateBase = (state: RootState) => state.roster;

export const selectRosterEntries = createSelector(
  [selectRosterStateBase],
  (roster) => roster.entries,
);

export const selectRosterLoading = createSelector(
  [selectRosterStateBase],
  (roster) => roster.loading,
);

export const selectRosterError = createSelector(
  [selectRosterStateBase],
  (roster) => roster.error,
);

export const selectRosterEntryById = (entryId: string) =>
  createSelector([selectRosterEntries], (entries) => entries[entryId] || null);

export const selectRosterEntriesList = createSelector([selectRosterEntries], (entries) =>
  Object.values(entries),
);

export const selectRosterEntriesByDate = (date: string) =>
  createSelector([selectRosterEntries], (entries) => entries[date] || null);

export const selectRosterEntriesByTeam = (teamId: string) =>
  createSelector([selectRosterEntriesList], (entries) =>
    entries.filter((entry) => Object.keys(entry.teams).includes(teamId)),
  );

export const selectRosterEntriesByUser = (userEmail: string) =>
  createSelector([selectRosterEntriesList], (entries) =>
    entries.filter((entry) => {
      return Object.values(entry.teams).some((team) =>
        Object.values(team).some((positions) => positions.includes(userEmail)),
      );
    }),
  );

export const selectDateRange = (startDate: string, endDate: string) =>
  createSelector([selectRosterEntriesList], (entries) =>
    entries.filter((entry) => entry.date >= startDate && entry.date <= endDate),
  );

export const selectRosterStats = createSelector(
  [selectRosterEntriesList],
  (entries) => {
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
  },
);