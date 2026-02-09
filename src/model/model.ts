export type Gender = "Male" | "Female" | "";
export type Weekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface AppUser {
  name: string | null;
  email: string | null;
  teams: string[];
  positions: string[];
  gender: string;
  isApproved: boolean;
  isAdmin: boolean;
  isActive: boolean;
}

export interface Team {
  name: string;
  emoji: string;
  positions: Position[];
  preferredDays: Weekday[];
}

export interface Position {
  name: string;
  emoji: string;
  colour: string;
  parentId?: string;
}

export interface Absence {
  reason: string;
}

export type TeamAssignments = Record<string, string[]>;

export interface RosterEntry {
  id: string;
  date: string;
  teams: Record<string, TeamAssignments>;
  absence: Record<string, Absence>;
  createdAt: Date;
  updatedAt: Date;
}
