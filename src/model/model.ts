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
  sortByGender?: boolean;
  isCustom?: boolean;
  customLabels?: string[];
}

export interface Absence {
  reason: string;
}

export type TeamAssignments = Record<string, string[]>; // userEmail/uid -> positionNames[]

export interface RosterEntry {
  id: string; // Document ID (usually date)
  date: string; // YYYY-MM-DD
  eventName?: string; // Special occasion name
  teams: Record<string, TeamAssignments>; // teamName -> { userIdentifier -> positions[] }
  absence: Record<string, Absence>; // userIdentifier -> { reason }
  updatedAt?: number;
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

export const formatToDateKey = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const getTodayKey = (): string => {
  // Always calculate "Today" relative to NZ time (Pacific/Auckland)
  const nzDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  // en-CA returns YYYY-MM-DD
  return nzDate;
};
