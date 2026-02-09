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
  teamPositions?: Record<string, string[]>; // teamName -> positionNames[]
  indexedAssignments?: string[]; // ["TeamName|PositionName", ...]
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
  maxConflict: number;
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

export type TeamAssignments = Record<string, string[]>; // userEmail/uid -> positionNames[]

export interface RosterEntry {
  id: string; // Document ID (usually date)
  date: string; // YYYY-MM-DD
  teams: Record<string, TeamAssignments>; // teamName -> { userIdentifier -> positions[] }
  absence: Record<string, Absence>; // userIdentifier -> { reason }
  updatedAt?: unknown;
}

export const generateIndexedAssignments = (
  teamPositions: Record<string, string[]>,
): string[] => {
  const indexed: string[] = [];
  Object.entries(teamPositions).forEach(([teamName, positions]) => {
    positions.forEach((posName) => {
      indexed.push(`${teamName}|${posName}`);
    });
  });
  return indexed;
};
