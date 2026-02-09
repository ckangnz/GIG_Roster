import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../index';

const selectTeamsState = (state: RootState) => state.teams;
const selectPositionsState = (state: RootState) => state.positions;
const selectGendersState = (state: RootState) => state.genders;

export const selectTeams = createSelector([selectTeamsState], (teams) => teams.teams);

export const selectTeamsLoading = createSelector(
  [selectTeamsState],
  (teams) => teams.loading,
);

export const selectTeamsError = createSelector([selectTeamsState], (teams) => teams.error);

export const selectTeamByName = (teamName: string) =>
  createSelector([selectTeams], (teams) => teams.find((team) => team.name === teamName));

export const selectTeamsByNameFilter = (nameFilter: string) =>
  createSelector(
    [selectTeams],
    (teams) =>
      teams.filter((team) => team.name.toLowerCase().includes(nameFilter.toLowerCase())),
  );

export const selectPositions = createSelector(
  [selectPositionsState],
  (positions) => positions.positions,
);

export const selectPositionsLoading = createSelector(
  [selectPositionsState],
  (positions) => positions.loading,
);

export const selectPositionsError = createSelector(
  [selectPositionsState],
  (positions) => positions.error,
);

export const selectPositionByName = (positionName: string) =>
  createSelector([selectPositions], (positions) =>
    positions.find((position) => position.name === positionName),
  );

export const selectPositionsByNameFilter = (nameFilter: string) =>
  createSelector(
    [selectPositions],
    (positions) =>
      positions.filter((position) =>
        position.name.toLowerCase().includes(nameFilter.toLowerCase()),
      ),
  );

export const selectGenders = createSelector(
  [selectGendersState],
  (genders) => genders.genders,
);

export const selectGenderById = (genderId: string) =>
  createSelector([selectGenders], (genders) => genders.find((gender) => gender.id === genderId));
