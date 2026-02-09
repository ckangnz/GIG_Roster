import { createSlice } from '@reduxjs/toolkit';

export interface Gender {
  id: string;
  name: string;
}

interface GendersState {
  genders: Gender[];
}

const STATIC_GENDERS: Gender[] = [
  { id: 'male', name: 'Male' },
  { id: 'female', name: 'Female' },
  { id: 'other', name: 'Other' },
  { id: 'preferred-not-to-say', name: 'Prefer not to say' },
];

const initialState: GendersState = {
  genders: STATIC_GENDERS,
};

const gendersSlice = createSlice({
  name: 'genders',
  initialState,
  reducers: {},
});

export const gendersReducer = gendersSlice.reducer;
